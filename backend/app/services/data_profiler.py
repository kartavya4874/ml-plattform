"""Automated data profiling — generates quality reports for uploaded datasets."""
import io
import json
import zipfile
import asyncio
from typing import Any
import pandas as pd
import numpy as np
from app.models.models import DatasetType
from app.core.config import settings


async def profile_dataset(
    dataset_id: str,
    minio_path: str,
    dataset_type: DatasetType,
    file_content: bytes,
) -> None:
    from app.models.models import Dataset
    import uuid

    try:
        profile = await asyncio.get_event_loop().run_in_executor(
            None,
            _profile_sync,
            dataset_type,
            file_content,
            minio_path,
        )
        status = "ready"
    except Exception as exc:
        profile = {"error": str(exc)}
        status = "error"

    dataset = await Dataset.get(uuid.UUID(dataset_id))
    if dataset:
        dataset.profile_report = profile
        dataset.status = status
        if "row_count" in profile:
            dataset.row_count = profile["row_count"]
        if "column_count" in profile:
            dataset.column_count = profile["column_count"]
        if "columns" in profile:
            dataset.columns_metadata = profile["columns"]
        dataset.quality_score = profile.get("quality_score")
        await dataset.save()


def _profile_sync(dataset_type: DatasetType, content: bytes, path: str) -> dict[str, Any]:
    """Blocking profile computation — run in thread pool."""
    if dataset_type == DatasetType.tabular:
        return _profile_tabular(content, path)
    elif dataset_type == DatasetType.image:
        return _profile_image(content)
    else:
        return _profile_text(content)


def _profile_tabular(content: bytes, path: str) -> dict[str, Any]:
    if path.endswith(".xlsx") or path.endswith(".xls"):
        df = pd.read_excel(io.BytesIO(content))
    elif path.endswith(".parquet"):
        df = pd.read_parquet(io.BytesIO(content))
    else:
        df = pd.read_csv(io.BytesIO(content))

    row_count, col_count = df.shape
    columns: dict[str, Any] = {}

    for col in df.columns:
        series = df[col]
        dtype = str(series.dtype)
        null_count = int(series.isna().sum())
        null_pct = round(null_count / max(row_count, 1) * 100, 2)
        unique_count = int(series.nunique())
        col_info: dict[str, Any] = {
            "dtype": dtype,
            "null_count": null_count,
            "null_pct": null_pct,
            "unique_count": unique_count,
        }
        if series.dtype in (np.float64, np.int64, np.float32, np.int32):
            col_info["mean"] = round(float(series.mean()), 4) if not series.isna().all() else None
            col_info["std"] = round(float(series.std()), 4) if not series.isna().all() else None
            col_info["min"] = float(series.min()) if not series.isna().all() else None
            col_info["max"] = float(series.max()) if not series.isna().all() else None
            col_info["q25"] = float(series.quantile(0.25)) if not series.isna().all() else None
            col_info["q75"] = float(series.quantile(0.75)) if not series.isna().all() else None
        else:
            top_vals = series.value_counts().head(5).to_dict()
            col_info["top_values"] = {str(k): int(v) for k, v in top_vals.items()}
        columns[col] = col_info

    # Compute correlation matrix for numeric cols
    numeric_df = df.select_dtypes(include="number")
    correlations: dict[str, Any] = {}
    if len(numeric_df.columns) > 1:
        corr = numeric_df.corr().round(3).fillna(0).to_dict()
        correlations = {str(k): {str(kk): float(vv) for kk, vv in v.items()} for k, v in corr.items()}

    # Quality score: penalize for missing values and low unique counts
    total_cells = row_count * col_count
    total_nulls = sum(ci["null_count"] for ci in columns.values())
    completeness = 1.0 - (total_nulls / max(total_cells, 1))
    quality_score = round(completeness * 100, 1)

    return {
        "row_count": row_count,
        "column_count": col_count,
        "columns": columns,
        "correlations": correlations,
        "quality_score": quality_score,
        "sample": df.head(100).fillna("").to_dict(orient="records"),
    }


def _profile_image(content: bytes) -> dict[str, Any]:
    from PIL import Image
    classes: dict[str, int] = {}
    total_images = 0

    with zipfile.ZipFile(io.BytesIO(content)) as zf:
        for name in zf.namelist():
            parts = name.split("/")
            if len(parts) >= 2 and not parts[-1].startswith("."):
                class_name = parts[-2] if len(parts) > 2 else parts[0]
                if name.lower().endswith((".jpg", ".jpeg", ".png", ".bmp", ".webp")):
                    classes[class_name] = classes.get(class_name, 0) + 1
                    total_images += 1

    quality_score = min(100.0, (total_images / max(len(classes) * 10, 1)) * 20) if classes else 0

    return {
        "total_images": total_images,
        "num_classes": len(classes),
        "class_distribution": classes,
        "quality_score": round(quality_score, 1),
        "row_count": total_images,
        "column_count": len(classes),
    }


def _profile_text(content: bytes) -> dict[str, Any]:
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception:
        lines = content.decode("utf-8", errors="replace").splitlines()
        df = pd.DataFrame({"text": lines})

    row_count = len(df)
    text_col = df.columns[0]
    avg_len = float(df[text_col].astype(str).apply(len).mean())
    label_dist: dict[str, int] = {}
    if len(df.columns) > 1:
        label_col = df.columns[1]
        label_dist = df[label_col].value_counts().to_dict()
        label_dist = {str(k): int(v) for k, v in label_dist.items()}

    return {
        "row_count": row_count,
        "column_count": len(df.columns),
        "avg_text_length": round(avg_len, 1),
        "label_distribution": label_dist,
        "quality_score": min(100.0, row_count / 10),
        "columns": {col: {"dtype": str(df[col].dtype)} for col in df.columns},
    }
