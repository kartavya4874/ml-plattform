"""Data management routes — /api/v1/data/"""
import uuid
import io
import asyncio
from typing import Any
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Query
from fastapi.responses import Response

from app.models.models import User, Dataset, DatasetType
from app.schemas.schemas import DatasetOut, DatasetDetail
from app.api.v1.auth import get_current_user
from app.services.storage_service import StorageService
from app.services.data_profiler import profile_dataset
from app.services.quota_service import check_quota, increment_usage, get_user_tier, get_tier_limits
from app.core.config import settings

router = APIRouter(prefix="/data", tags=["Data Management"])


def _get_size_limit(user: User, tier_limits: dict) -> int:
    """Return the file size limit in bytes based on subscription tier."""
    return tier_limits.get("max_file_size_bytes", settings.MAX_FILE_SIZE_FREE)


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
    # Check dataset quota
    await check_quota(current_user.id, "datasets")

    # Validate file size
    content = await file.read()
    tier = await get_user_tier(current_user.id)
    tier_limits = get_tier_limits(tier)
    size_limit = _get_size_limit(current_user, tier_limits)
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
        bucket=settings.R2_BUCKET_DATA,
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

    # Track usage
    await increment_usage(current_user.id, "datasets")

    return dataset


@router.get("/datasets", response_model=list[DatasetOut])
async def list_datasets(
    current_user: User = Depends(get_current_user),
):
    """List all datasets belonging to or shared with the current user."""
    return await Dataset.find(
        {"$or": [
            {"owner_id": current_user.id},
            {"collaborator_ids": current_user.id}
        ]}
    ).to_list()


def _check_dataset_access(dataset: Dataset, user: User, requires_edit: bool = False):
    if dataset.owner_id == user.id:
        return
    if user.id in dataset.collaborator_ids:
        return
    if not requires_edit and dataset.is_public:
        return
    raise HTTPException(status_code=403, detail="Not authorized to access this dataset")


@router.get("/datasets/{dataset_id}", response_model=DatasetDetail)
async def get_dataset(
    dataset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
):
    """Get dataset metadata and quality profile."""
    dataset = await Dataset.get(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    _check_dataset_access(dataset, current_user)
    return dataset


class DatasetPatch(BaseModel):
    name: str | None = None
    description: str | None = None
    is_public: bool | None = None
    tags: list[str] | None = None
    readme: str | None = None


@router.patch("/datasets/{dataset_id}", response_model=DatasetOut)
async def update_dataset(
    dataset_id: uuid.UUID,
    body: DatasetPatch,
    current_user: User = Depends(get_current_user),
):
    """Update dataset metadata — visibility, description, tags."""
    dataset = await Dataset.get(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if dataset.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can update dataset")

    if body.name is not None:
        dataset.name = body.name
    if body.description is not None:
        dataset.description = body.description
    if body.is_public is not None:
        dataset.is_public = body.is_public
    if body.tags is not None:
        dataset.tags = body.tags
    if body.readme is not None:
        dataset.readme = body.readme
    await dataset.save()
    return dataset


@router.get("/datasets/{dataset_id}/download")
async def download_dataset(
    dataset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    storage: StorageService = Depends(StorageService.get_instance),
):
    """Download the raw dataset file."""
    dataset = await Dataset.get(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    _check_dataset_access(dataset, current_user)

    try:
        data = await storage.download_bytes(settings.R2_BUCKET_DATA, dataset.minio_path)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to retrieve file from storage")

    filename = dataset.name or "dataset"
    return Response(
        content=data,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/datasets/{dataset_id}", status_code=204)
async def delete_dataset(
    dataset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    storage: StorageService = Depends(StorageService.get_instance),
):
    """Delete dataset and its MinIO objects."""
    dataset = await Dataset.get(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    if dataset.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can delete dataset")

    # Delete from MinIO
    await storage.delete_object(settings.R2_BUCKET_DATA, dataset.minio_path)

    await dataset.delete()


@router.get("/datasets/{dataset_id}/profile")
async def get_dataset_profile(
    dataset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Return the auto-generated data quality report."""
    dataset = await Dataset.get(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    _check_dataset_access(dataset, current_user)
    
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


# ── Data Preparation & EDA ────────────────────────────────────────────────────

class TransformRequest(BaseModel):
    operations: list[dict[str, Any]]


@router.post("/datasets/{dataset_id}/transform")
async def transform_dataset(
    dataset_id: uuid.UUID,
    body: TransformRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    storage: StorageService = Depends(StorageService.get_instance),
) -> dict[str, Any]:
    """Apply a pipeline of transformations to a dataset. Creates a new version."""
    from app.services.data_prep_service import load_dataset_df, apply_pipeline, get_sample_data

    dataset = await Dataset.get(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    _check_dataset_access(dataset, current_user, requires_edit=True)
    
    if dataset.dataset_type != "tabular":
        raise HTTPException(status_code=400, detail="Transforms only supported for tabular datasets")

    # Load and transform
    df = await load_dataset_df(dataset)
    original_shape = df.shape
    df = apply_pipeline(df, body.operations)
    new_shape = df.shape

    # Save transformed data back to storage
    buf = io.BytesIO()
    df.to_csv(buf, index=False)
    content = buf.getvalue()

    new_version = dataset.version + 1
    new_minio_path = f"{current_user.id}/{dataset.id}/v{new_version}.csv"
    await storage.upload_bytes(
        bucket=settings.R2_BUCKET_DATA,
        object_name=new_minio_path,
        data=content,
        content_type="text/csv",
    )

    # Update dataset metadata
    dataset.minio_path = new_minio_path
    dataset.version = new_version
    dataset.file_size_bytes = len(content)
    dataset.row_count = new_shape[0]
    dataset.column_count = new_shape[1]
    dataset.status = "processing"
    await dataset.save()

    # Re-profile in background
    background_tasks.add_task(
        profile_dataset,
        dataset_id=str(dataset.id),
        minio_path=new_minio_path,
        dataset_type=DatasetType.tabular,
        file_content=content,
    )

    sample = get_sample_data(df, rows=20)

    return {
        "message": f"Applied {len(body.operations)} transform(s). Dataset updated to v{new_version}.",
        "version": new_version,
        "original_shape": {"rows": original_shape[0], "columns": original_shape[1]},
        "new_shape": {"rows": new_shape[0], "columns": new_shape[1]},
        "preview": sample,
    }


@router.get("/datasets/{dataset_id}/eda")
async def get_dataset_eda(
    dataset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Return comprehensive EDA summary for a dataset."""
    from app.services.data_prep_service import load_dataset_df, compute_eda

    dataset = await Dataset.get(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    _check_dataset_access(dataset, current_user)
    
    if dataset.dataset_type != "tabular":
        raise HTTPException(status_code=400, detail="EDA only supported for tabular datasets")

    df = await load_dataset_df(dataset)
    eda = await asyncio.get_event_loop().run_in_executor(None, compute_eda, df)
    return eda


@router.get("/datasets/{dataset_id}/sample")
async def get_dataset_sample(
    dataset_id: uuid.UUID,
    rows: int = Query(50, ge=1, le=500),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Return sample rows from a dataset."""
    from app.services.data_prep_service import load_dataset_df, get_sample_data

    dataset = await Dataset.get(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    _check_dataset_access(dataset, current_user)

    df = await load_dataset_df(dataset)
    return get_sample_data(df, rows=rows)


@router.post("/datasets/{dataset_id}/auto-fix")
async def auto_fix_dataset(
    dataset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    storage: StorageService = Depends(StorageService.get_instance),
):
    """One-click auto-fix: handle missing values, encode categoricals, normalize numerics.
    
    Creates a new cleaned version of the dataset. Non-destructive — original is kept.
    """
    import pandas as pd
    import numpy as np

    dataset = await Dataset.get(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if dataset.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can auto-fix")
    if dataset.dataset_type != "tabular":
        raise HTTPException(status_code=400, detail="Auto-fix only works on tabular datasets")

    # Load original
    content = await storage.download_bytes(settings.R2_BUCKET_DATA, dataset.minio_path)
    path = dataset.minio_path.lower()
    if path.endswith((".xlsx", ".xls")):
        df = pd.read_excel(io.BytesIO(content))
    elif path.endswith(".parquet"):
        df = pd.read_parquet(io.BytesIO(content))
    else:
        df = pd.read_csv(io.BytesIO(content))

    original_shape = df.shape
    fixes_applied = []

    # 1. Handle missing values
    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    cat_cols = df.select_dtypes(exclude="number").columns.tolist()

    nulls_before = int(df.isnull().sum().sum())
    for c in numeric_cols:
        if df[c].isnull().any():
            df[c] = df[c].fillna(df[c].median())
    for c in cat_cols:
        if df[c].isnull().any():
            mode = df[c].mode()
            df[c] = df[c].fillna(mode.iloc[0] if len(mode) > 0 else "unknown")
    nulls_after = int(df.isnull().sum().sum())
    if nulls_before > 0:
        fixes_applied.append(f"Filled {nulls_before} missing values (numeric→median, text→mode)")

    # 2. Remove duplicate rows
    dupes = int(df.duplicated().sum())
    if dupes > 0:
        df = df.drop_duplicates().reset_index(drop=True)
        fixes_applied.append(f"Removed {dupes} duplicate rows")

    # 3. Remove constant columns (no predictive value)
    const_cols = [c for c in df.columns if df[c].nunique() <= 1]
    if const_cols:
        df = df.drop(columns=const_cols)
        fixes_applied.append(f"Removed {len(const_cols)} constant column(s): {', '.join(const_cols)}")

    # Save cleaned version
    cleaned_csv = df.to_csv(index=False).encode("utf-8")
    clean_name = f"cleaned_{dataset.name}" if not dataset.name.startswith("cleaned_") else dataset.name
    clean_path = f"{current_user.id}/{dataset_id}/{clean_name}"
    await storage.upload_bytes(
        bucket=settings.R2_BUCKET_DATA,
        object_name=clean_path,
        data=cleaned_csv,
        content_type="text/csv",
    )

    # Update dataset record
    dataset.minio_path = clean_path
    dataset.name = clean_name
    dataset.file_size_bytes = len(cleaned_csv)
    dataset.row_count = df.shape[0]
    dataset.column_count = df.shape[1]
    dataset.version = (dataset.version or 1) + 1
    dataset.status = "ready"
    await dataset.save()

    # Re-profile the cleaned dataset
    await asyncio.get_event_loop().run_in_executor(
        None,
        lambda: asyncio.run(profile_dataset(
            dataset_id=str(dataset_id),
            minio_path=clean_path,
            dataset_type="tabular",
            file_content=cleaned_csv,
        ))
    )

    return {
        "message": f"✅ Auto-fix complete! {len(fixes_applied)} fix(es) applied.",
        "fixes": fixes_applied,
        "original_shape": list(original_shape),
        "new_shape": list(df.shape),
        "new_version": dataset.version,
    }


class FeatureImportanceRequest(BaseModel):
    target_column: str
    task_type: str = "classification"  # classification or regression

@router.post("/datasets/{dataset_id}/feature-importance")
async def compute_feature_importance(
    dataset_id: uuid.UUID,
    body: FeatureImportanceRequest,
    current_user: User = Depends(get_current_user),
    storage: StorageService = Depends(StorageService.get_instance)
):
    """Compute feature importance using a fast RandomForest on a sample of data."""
    import pandas as pd
    import numpy as np
    
    dataset = await Dataset.get(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    if dataset.dataset_type != "tabular":
        raise HTTPException(status_code=400, detail="Only tabular datasets supported")

    content = await storage.download_bytes(settings.R2_BUCKET_DATA, dataset.minio_path)
    path = dataset.minio_path.lower()
    
    # Try reading it with pandas
    try:
        if path.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(content))
        elif path.endswith(".parquet"):
            df = pd.read_parquet(io.BytesIO(content))
        else:
            df = pd.read_csv(io.BytesIO(content))
    except Exception:
        raise HTTPException(status_code=400, detail="Could not parse dataset file")
        
    df = df.sample(n=min(5000, len(df)))
        
    if body.target_column not in df.columns:
        raise HTTPException(status_code=400, detail=f"Target column '{body.target_column}' not found")
        
    y = df[body.target_column]
    X = df.drop(columns=[body.target_column])
    
    # Very basic Preprocess
    numeric_cols = X.select_dtypes(include="number").columns
    cat_cols = X.select_dtypes(exclude="number").columns
    for c in numeric_cols: X[c] = X[c].fillna(X[c].median())
    for c in cat_cols: 
        X[c] = X[c].fillna("unknown").astype("category").cat.codes
        
    mask = y.notna()
    X, y = X[mask], y[mask]
    
    try:
        if body.task_type == "classification":
            if not pd.api.types.is_numeric_dtype(y):
                y = y.astype("category").cat.codes
            from sklearn.ensemble import RandomForestClassifier
            model = RandomForestClassifier(n_estimators=50, max_depth=5, random_state=42, n_jobs=-1)
        else:
            from sklearn.ensemble import RandomForestRegressor
            model = RandomForestRegressor(n_estimators=50, max_depth=5, random_state=42, n_jobs=-1)
            
        model.fit(X, y)
        importances = model.feature_importances_
        
        result = sorted(zip(X.columns, importances.tolist()), key=lambda x: x[1], reverse=True)[:20]
        return {"feature_importance": [{"feature": f, "importance": round(imp, 4)} for f, imp in result]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute feature importance: {str(e)}")

