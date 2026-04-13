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


class R2Storage(BaseStorage):
    def __init__(self):
        import boto3
        from botocore.config import Config
        self._s3 = boto3.client(
            's3',
            endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            config=Config(signature_version='s3v4'),
        )

    def _ensure_buckets(self):
        pass # Buckets should be pre-created in Cloudflare Dashboard

    async def upload_bytes(self, bucket: str, object_name: str, data: bytes, content_type: str = "application/octet-stream"):
        from functools import partial
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            partial(self._s3.put_object, Bucket=bucket, Key=object_name, Body=data, ContentType=content_type)
        )

    async def download_bytes(self, bucket: str, object_name: str) -> bytes:
        from functools import partial
        loop = asyncio.get_event_loop()
        try:
            response = await loop.run_in_executor(
                None,
                partial(self._s3.get_object, Bucket=bucket, Key=object_name)
            )
            return response['Body'].read()
        except Exception as e:
            raise ValueError(f"File not found or error: {str(e)}")

    async def delete_object(self, bucket: str, object_name: str):
        from functools import partial
        loop = asyncio.get_event_loop()
        try:
            await loop.run_in_executor(None, partial(self._s3.delete_object, Bucket=bucket, Key=object_name))
        except Exception:
            pass

    async def presigned_url(self, bucket: str, object_name: str, expiry_hours: int = 1) -> str:
        from functools import partial
        loop = asyncio.get_event_loop()
        url = await loop.run_in_executor(
            None,
            partial(
                self._s3.generate_presigned_url,
                'get_object',
                Params={'Bucket': bucket, 'Key': object_name},
                ExpiresIn=expiry_hours * 3600
            )
        )
        return url

    async def list_objects(self, bucket: str, prefix: str = "") -> list[str]:
        from functools import partial
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            partial(self._s3.list_objects_v2, Bucket=bucket, Prefix=prefix)
        )
        if 'Contents' in response:
            return [obj['Key'] for obj in response['Contents']]
        return []


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


class StorageService:
    _instance: "BaseStorage | None" = None

    @classmethod
    async def get_instance(cls) -> BaseStorage:
        if cls._instance is not None:
            return cls._instance

        backend = settings.STORAGE_BACKEND.lower()
        if backend == "r2":
            try:
                cls._instance = R2Storage()
            except Exception as e:
                log.warning("storage.r2.failed_fallback_to_local", error=str(e))
                cls._instance = LocalStorage()
        elif backend == "mongodb":
            try:
                cls._instance = MongoStorage()
                cls._instance._get_fs("test")
            except Exception as e:
                log.warning("storage.mongodb.failed_fallback_to_local", error=str(e))
                cls._instance = LocalStorage()
        else:
            cls._instance = LocalStorage()

        return cls._instance
