"""Data management routes — /api/v1/data/"""
import uuid
import io
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import Response

from app.models.models import User, Dataset, DatasetType
from app.schemas.schemas import DatasetOut, DatasetDetail
from app.api.v1.auth import get_current_user
from app.services.storage_service import StorageService
from app.services.data_profiler import profile_dataset
from app.core.config import settings

router = APIRouter(prefix="/data", tags=["Data Management"])


def _get_size_limit(user: User) -> int:
    """Return the file size limit in bytes based on user role."""
    from app.models.models import UserRole
    if user.role == UserRole.admin:
        return settings.MAX_FILE_SIZE_ENTERPRISE
    if user.role == UserRole.pro:
        return settings.MAX_FILE_SIZE_PRO
    return settings.MAX_FILE_SIZE_FREE


def _detect_dataset_type(filename: str, content_type: str) -> DatasetType:
    """Auto-detect whether upload is tabular, image, or text."""
    name_lower = filename.lower()
    if name_lower.endswith((".csv", ".xlsx", ".xls", ".parquet")):
        return DatasetType.tabular
    if name_lower.endswith(".zip"):
        # Assume image zip — text datasets must be CSV
        return DatasetType.image
    if name_lower.endswith(".txt"):
        return DatasetType.text
    # Fallback on content type
    if "csv" in content_type or "excel" in content_type or "spreadsheet" in content_type:
        return DatasetType.tabular
    if "zip" in content_type:
        return DatasetType.image
    return DatasetType.tabular


@router.post("/upload", response_model=DatasetOut, status_code=201)
async def upload_dataset(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    storage: StorageService = Depends(StorageService.get_instance),
):
    """Upload a CSV, Excel, image ZIP, or text file."""
    # Validate file size
    content = await file.read()
    size_limit = _get_size_limit(current_user)
    if len(content) > size_limit:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds your tier's limit of {size_limit // (1024**2)} MB"
        )

    # MIME validation
    allowed_mimes = {
        "text/csv", "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/zip", "application/x-zip-compressed",
        "text/plain", "application/octet-stream",
    }
    if file.content_type and file.content_type not in allowed_mimes:
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {file.content_type}")

    dataset_type = _detect_dataset_type(file.filename or "upload.csv", file.content_type or "")

    # Store in MinIO
    dataset_id = uuid.uuid4()
    minio_path = f"{current_user.id}/{dataset_id}/{file.filename}"
    await storage.upload_bytes(
        bucket=settings.MINIO_BUCKET_DATA,
        object_name=minio_path,
        data=content,
        content_type=file.content_type or "application/octet-stream",
    )

    dataset = Dataset(
        owner_id=current_user.id,
        name=file.filename or "unnamed",
        dataset_type=dataset_type,
        file_size_bytes=len(content),
        minio_path=minio_path,
        status="processing",
    )
    # Beanie generates the UUID id on insert
    await dataset.insert()
    dataset_id = dataset.id

    # Kick off profiling in background
    background_tasks.add_task(
        profile_dataset,
        dataset_id=str(dataset_id),
        minio_path=minio_path,
        dataset_type=dataset_type,
        file_content=content,
    )
    return dataset


@router.get("/datasets", response_model=list[DatasetOut])
async def list_datasets(
    current_user: User = Depends(get_current_user),
):
    """List all datasets belonging to the current user."""
    return await Dataset.find(Dataset.owner_id == current_user.id).to_list()


@router.get("/datasets/{dataset_id}", response_model=DatasetDetail)
async def get_dataset(
    dataset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
):
    """Get dataset metadata and quality profile."""
    dataset = await Dataset.find_one(Dataset.id == dataset_id, Dataset.owner_id == current_user.id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


@router.delete("/datasets/{dataset_id}", status_code=204)
async def delete_dataset(
    dataset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    storage: StorageService = Depends(StorageService.get_instance),
):
    """Delete dataset and its MinIO objects."""
    dataset = await Dataset.find_one(Dataset.id == dataset_id, Dataset.owner_id == current_user.id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Delete from MinIO
    await storage.delete_object(settings.MINIO_BUCKET_DATA, dataset.minio_path)

    await dataset.delete()


@router.get("/datasets/{dataset_id}/profile")
async def get_dataset_profile(
    dataset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Return the auto-generated data quality report."""
    dataset = await Dataset.find_one(Dataset.id == dataset_id, Dataset. owner_id == current_user.id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if dataset.status == "processing":
        return {"status": "processing", "message": "Profile is being generated"}
    return dataset.profile_report or {}


@router.get("/download/{bucket}/{object_name:path}")
async def download_file(
    bucket: str, 
    object_name: str, 
    storage=Depends(StorageService.get_instance)
):
    """Generic endpoint to download files from Local and Mongo backends."""
    try:
        data = await storage.download_bytes(bucket, object_name)
        # simplistic MIME detection
        content_type = "application/octet-stream"
        lower_name = object_name.lower()
        if lower_name.endswith(".csv"):
            content_type = "text/csv"
        elif lower_name.endswith(".zip"):
            content_type = "application/zip"
        return Response(content=data, media_type=content_type)
    except ValueError:
        raise HTTPException(status_code=404, detail="File not found")

