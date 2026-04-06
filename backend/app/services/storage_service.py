"""Storage service with support for Local, MinIO, MongoDB GridFS, and Firebase."""
import os
import asyncio
from io import BytesIO
import structlog
from app.core.config import settings

log = structlog.get_logger()

class BaseStorage:
    async def upload_bytes(self, bucket: str, object_name: str, data: bytes, content_type: str = "application/octet-stream"):
        raise NotImplementedError

    async def download_bytes(self, bucket: str, object_name: str) -> bytes:
        raise NotImplementedError

    async def delete_object(self, bucket: str, object_name: str):
        raise NotImplementedError

    async def presigned_url(self, bucket: str, object_name: str, expiry_hours: int = 1) -> str:
        raise NotImplementedError

    async def list_objects(self, bucket: str, prefix: str = "") -> list[str]:
        raise NotImplementedError


class LocalStorage(BaseStorage):
    def __init__(self):
        self._local_base = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "storage")

    async def upload_bytes(self, bucket: str, object_name: str, data: bytes, content_type: str = "application/octet-stream"):
        target_path = os.path.join(self._local_base, bucket, object_name)
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        loop = asyncio.get_event_loop()
        def _write():
            with open(target_path, "wb") as f:
                f.write(data)
        await loop.run_in_executor(None, _write)

    async def download_bytes(self, bucket: str, object_name: str) -> bytes:
        target_path = os.path.join(self._local_base, bucket, object_name)
        if not os.path.exists(target_path):
            raise ValueError(f"File not found: {target_path}")
        loop = asyncio.get_event_loop()
        def _read():
            with open(target_path, "rb") as f:
                return f.read()
        return await loop.run_in_executor(None, _read)

    async def delete_object(self, bucket: str, object_name: str):
        target_path = os.path.join(self._local_base, bucket, object_name)
        if os.path.exists(target_path):
            os.remove(target_path)

    async def presigned_url(self, bucket: str, object_name: str, expiry_hours: int = 1) -> str:
        return f"{settings.API_BASE_URL.rstrip('/')}/api/v1/data/download/{bucket}/{object_name}"

    async def list_objects(self, bucket: str, prefix: str = "") -> list[str]:
        bucket_path = os.path.join(self._local_base, bucket)
        if not os.path.exists(bucket_path):
            return []
        
        results = []
        for root, _, files in os.walk(bucket_path):
            for f in files:
                full_path = os.path.join(root, f)
                rel_path = os.path.relpath(full_path, bucket_path).replace(os.path.sep, "/")
                if rel_path.startswith(prefix):
                    results.append(rel_path)
        return results


class MinioStorage(BaseStorage):
    def __init__(self):
        from minio import Minio
        self._client = Minio(
            endpoint=settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
        )
        self._ready = False

    def _ensure_buckets(self):
        if self._ready: return
        try:
            for bucket in (settings.MINIO_BUCKET_DATA, settings.MINIO_BUCKET_MODELS):
                if not self._client.bucket_exists(bucket):
                    self._client.make_bucket(bucket)
            self._ready = True
        except Exception as e:
            log.error("minio.ensure_buckets.failed", error=str(e))

    async def upload_bytes(self, bucket: str, object_name: str, data: bytes, content_type: str = "application/octet-stream"):
        from functools import partial
        self._ensure_buckets()
        stream = BytesIO(data)
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            partial(self._client.put_object, bucket, object_name, stream, len(data), content_type=content_type),
        )

    async def download_bytes(self, bucket: str, object_name: str) -> bytes:
        from functools import partial
        self._ensure_buckets()
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            partial(self._client.get_object, bucket, object_name),
        )
        data = response.read()
        response.close()
        response.release_conn()
        return data

    async def delete_object(self, bucket: str, object_name: str):
        from functools import partial
        self._ensure_buckets()
        loop = asyncio.get_event_loop()
        try:
            await loop.run_in_executor(None, partial(self._client.remove_object, bucket, object_name))
        except Exception:
            pass

    async def presigned_url(self, bucket: str, object_name: str, expiry_hours: int = 1) -> str:
        from functools import partial
        from datetime import timedelta
        self._ensure_buckets()
        loop = asyncio.get_event_loop()
        url = await loop.run_in_executor(
            None,
            partial(self._client.presigned_get_object, bucket, object_name, expires=timedelta(hours=expiry_hours)),
        )
        return url

    async def list_objects(self, bucket: str, prefix: str = "") -> list[str]:
        from functools import partial
        self._ensure_buckets()
        loop = asyncio.get_event_loop()
        objects = await loop.run_in_executor(
            None,
            partial(self._client.list_objects, bucket, prefix=prefix, recursive=True),
        )
        return [obj.object_name for obj in objects]


class MongoStorage(BaseStorage):
    def __init__(self):
        from app.core import database
        from motor.motor_asyncio import AsyncIOMotorGridFSBucket
        self._db_mod = database
        self._GridFSBucket = AsyncIOMotorGridFSBucket
    
    def _get_fs(self, bucket: str):
        if not self._db_mod.client:
            raise RuntimeError("Database not initialized")
        db = self._db_mod.client[settings.MONGODB_DB_NAME]
        return self._GridFSBucket(db, bucket_name=bucket)

    async def upload_bytes(self, bucket: str, object_name: str, data: bytes, content_type: str = "application/octet-stream"):
        fs = self._get_fs(bucket)
        cursor = fs.find({"filename": object_name})
        async for doc in cursor:
            await fs.delete(doc._id)
        
        await fs.upload_from_stream(
            object_name, 
            data, 
            metadata={"contentType": content_type}
        )

    async def download_bytes(self, bucket: str, object_name: str) -> bytes:
        fs = self._get_fs(bucket)
        cursor = fs.find({"filename": object_name}).sort("uploadDate", -1).limit(1)
        grid_out = None
        async for doc in cursor:
            grid_out = doc
            break
            
        if not grid_out:
            raise ValueError(f"File not found: {object_name}")
            
        stream = BytesIO()
        await fs.download_to_stream(grid_out._id, stream)
        return stream.getvalue()

    async def delete_object(self, bucket: str, object_name: str):
        fs = self._get_fs(bucket)
        cursor = fs.find({"filename": object_name})
        async for doc in cursor:
            await fs.delete(doc._id)

    async def presigned_url(self, bucket: str, object_name: str, expiry_hours: int = 1) -> str:
        return f"{settings.API_BASE_URL.rstrip('/')}/api/v1/data/download/{bucket}/{object_name}"

    async def list_objects(self, bucket: str, prefix: str = "") -> list[str]:
        fs = self._get_fs(bucket)
        cursor = fs.find({"filename": {"$regex": f"^{prefix}"}})
        results = []
        async for doc in cursor:
            results.append(doc.filename)
        return results


class FirebaseStorage(BaseStorage):
    def __init__(self):
        import firebase_admin
        from firebase_admin import credentials, storage
        self._storage = storage
        
        if not firebase_admin._apps:
            if not settings.FIREBASE_CREDENTIALS_JSON or not os.path.exists(settings.FIREBASE_CREDENTIALS_JSON):
                log.warning("firebase.credentials.missing", hint="Check FIREBASE_CREDENTIALS_JSON")
            else:
                cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_JSON)
                firebase_admin.initialize_app(cred)

    async def upload_bytes(self, bucket: str, object_name: str, data: bytes, content_type: str = "application/octet-stream"):
        b = self._storage.bucket(bucket)
        blob = b.blob(object_name)
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, blob.upload_from_string, data, content_type)

    async def download_bytes(self, bucket: str, object_name: str) -> bytes:
        b = self._storage.bucket(bucket)
        blob = b.blob(object_name)
        if not blob.exists():
            raise ValueError(f"File not found: {object_name}")
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, blob.download_as_bytes)

    async def delete_object(self, bucket: str, object_name: str):
        b = self._storage.bucket(bucket)
        blob = b.blob(object_name)
        loop = asyncio.get_event_loop()
        try:
            await loop.run_in_executor(None, blob.delete)
        except Exception:
            pass

    async def presigned_url(self, bucket: str, object_name: str, expiry_hours: int = 1) -> str:
        from datetime import timedelta
        b = self._storage.bucket(bucket)
        blob = b.blob(object_name)
        loop = asyncio.get_event_loop()
        def _get_url():
            return blob.generate_signed_url(version="v4", expiration=timedelta(hours=expiry_hours), method="GET")
        return await loop.run_in_executor(None, _get_url)

    async def list_objects(self, bucket: str, prefix: str = "") -> list[str]:
        b = self._storage.bucket(bucket)
        loop = asyncio.get_event_loop()
        def _list():
            return [blob.name for blob in b.list_blobs(prefix=prefix)]
        return await loop.run_in_executor(None, _list)


class StorageService:
    _instance: "BaseStorage | None" = None

    @classmethod
    async def get_instance(cls) -> BaseStorage:
        if cls._instance is not None:
            return cls._instance

        backend = settings.STORAGE_BACKEND.lower()
        if backend == "minio":
            try:
                cls._instance = MinioStorage()
                cls._instance._ensure_buckets()
            except Exception as e:
                log.warning("storage.minio.failed_fallback_to_local", error=str(e))
                cls._instance = LocalStorage()
        elif backend == "mongodb":
            try:
                cls._instance = MongoStorage()
                cls._instance._get_fs("test")
            except Exception as e:
                log.warning("storage.mongodb.failed_fallback_to_local", error=str(e))
                cls._instance = LocalStorage()
        elif backend == "firebase":
            try:
                cls._instance = FirebaseStorage()
            except Exception as e:
                log.warning("storage.firebase.failed_fallback_to_local", error=str(e))
                cls._instance = LocalStorage()
        else:
            cls._instance = LocalStorage()

        return cls._instance
