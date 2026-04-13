"""Data preparation service — transform, clean, and analyze datasets."""
import io
import asyncio
from typing import Any
import pandas as pd
import numpy as np

from app.models.models import Dataset, DatasetType
from app.services.storage_service import StorageService
from app.core.config import settings


async def load_dataset_df(dataset: Dataset) -> pd.DataFrame:
    """Download dataset from storage and load into a pandas DataFrame."""
    storage = await StorageService.get_instance()
    content = await storage.download_bytes(settings.R2_BUCKET_DATA, dataset.minio_path)
    path = dataset.minio_path.lower()

    if path.endswith(".xlsx") or path.endswith(".xls"):
        return pd.read_excel(io.BytesIO(content))
    elif path.endswith(".parquet"):
        return pd.read_parquet(io.BytesIO(content))
    else:
        return pd.read_csv(io.BytesIO(content))


def apply_single_transform(df: pd.DataFrame, op: dict) -> pd.DataFrame:
    """Apply a single transformation operation to a DataFrame."""
    action = op.get("op", "")

    if action == "drop_columns":
        cols = op.get("columns", [])
        existing = [c for c in cols if c in df.columns]
        if existing:
            df = df.drop(columns=existing)

    elif action == "fill_missing":
        col = op.get("column")
        strategy = op.get("strategy", "mean")
        value = op.get("value")
        if col and col in df.columns:
            if strategy == "mean" and pd.api.types.is_numeric_dtype(df[col]):
                df[col] = df[col].fillna(df[col].mean())
            elif strategy == "median" and pd.api.types.is_numeric_dtype(df[col]):
                df[col] = df[col].fillna(df[col].median())
            elif strategy == "mode":
                mode_val = df[col].mode()
                if len(mode_val) > 0:
                    df[col] = df[col].fillna(mode_val.iloc[0])
            elif strategy == "zero":
                df[col] = df[col].fillna(0)
            elif strategy == "forward_fill":
                df[col] = df[col].ffill()
            elif strategy == "backward_fill":
                df[col] = df[col].bfill()
            elif strategy == "value" and value is not None:
                df[col] = df[col].fillna(value)
            elif strategy == "drop":
                df = df.dropna(subset=[col])

    elif action == "cast_dtype":
        col = op.get("column")
        to_type = op.get("to", "str")
        if col and col in df.columns:
            try:
                if to_type == "int":
                    df[col] = pd.to_numeric(df[col], errors="coerce").astype("Int64")
                elif to_type == "float":
                    df[col] = pd.to_numeric(df[col], errors="coerce")
                elif to_type == "str":
                    df[col] = df[col].astype(str)
                elif to_type == "bool":
                    df[col] = df[col].astype(bool)
                elif to_type == "datetime":
                    df[col] = pd.to_datetime(df[col], errors="coerce")
                elif to_type == "category":
                    df[col] = df[col].astype("category")
            except Exception:
                pass  # Silently skip if cast fails

    elif action == "rename_column":
        old_name = op.get("from")
        new_name = op.get("to")
        if old_name and new_name and old_name in df.columns:
            df = df.rename(columns={old_name: new_name})

    elif action == "filter_rows":
        col = op.get("column")
        condition = op.get("condition", "eq")
        value = op.get("value")
        if col and col in df.columns and value is not None:
            if condition == "eq":
                df = df[df[col] == value]
            elif condition == "neq":
                df = df[df[col] != value]
            elif condition == "gt":
                df = df[pd.to_numeric(df[col], errors="coerce") > float(value)]
            elif condition == "gte":
                df = df[pd.to_numeric(df[col], errors="coerce") >= float(value)]
            elif condition == "lt":
                df = df[pd.to_numeric(df[col], errors="coerce") < float(value)]
            elif condition == "lte":
                df = df[pd.to_numeric(df[col], errors="coerce") <= float(value)]
            elif condition == "contains":
                df = df[df[col].astype(str).str.contains(str(value), case=False, na=False)]
            elif condition == "not_contains":
                df = df[~df[col].astype(str).str.contains(str(value), case=False, na=False)]

    elif action == "encode_categorical":
        col = op.get("column")
        method = op.get("method", "label")
        if col and col in df.columns:
            if method == "onehot":
                dummies = pd.get_dummies(df[col], prefix=col, dtype=int)
                df = pd.concat([df.drop(columns=[col]), dummies], axis=1)
            elif method == "label":
                df[col] = df[col].astype("category").cat.codes

    elif action == "scale_numeric":
        col = op.get("column")
        method = op.get("method", "standard")
        if col and col in df.columns and pd.api.types.is_numeric_dtype(df[col]):
            if method == "standard":
                mean = df[col].mean()
                std = df[col].std()
                if std > 0:
                    df[col] = (df[col] - mean) / std
            elif method == "minmax":
                mn = df[col].min()
                mx = df[col].max()
                rng = mx - mn
                if rng > 0:
                    df[col] = (df[col] - mn) / rng
            elif method == "log":
                df[col] = np.log1p(df[col].clip(lower=0))

    elif action == "remove_duplicates":
        subset = op.get("subset")
        if subset and isinstance(subset, list):
            existing = [c for c in subset if c in df.columns]
            if existing:
                df = df.drop_duplicates(subset=existing)
        else:
            df = df.drop_duplicates()

    elif action == "drop_na_rows":
        subset = op.get("subset")
        if subset and isinstance(subset, list):
            existing = [c for c in subset if c in df.columns]
            if existing:
                df = df.dropna(subset=existing)
        else:
            df = df.dropna()

    return df.reset_index(drop=True)


def apply_pipeline(df: pd.DataFrame, operations: list[dict]) -> pd.DataFrame:
    """Apply a chain of transform operations to a DataFrame."""
    for op in operations:
        df = apply_single_transform(df, op)
    return df


def compute_eda(df: pd.DataFrame) -> dict[str, Any]:
    """Compute comprehensive EDA summary for a DataFrame."""
    result: dict[str, Any] = {
        "shape": {"rows": len(df), "columns": len(df.columns)},
        "columns": {},
        "missing_summary": {},
        "correlations": {},
        "numeric_stats": {},
    }

    # Per-column analysis
    for col in df.columns:
        series = df[col]
        null_count = int(series.isna().sum())
        null_pct = round(null_count / max(len(df), 1) * 100, 2)
        unique_count = int(series.nunique())
        dtype = str(series.dtype)

        col_info: dict[str, Any] = {
            "dtype": dtype,
            "null_count": null_count,
            "null_pct": null_pct,
            "unique_count": unique_count,
            "sample_values": [str(v) for v in series.dropna().head(5).tolist()],
        }

        if pd.api.types.is_numeric_dtype(series) and not pd.api.types.is_bool_dtype(series):
            clean = series.dropna()
            if len(clean) > 0:
                col_info["stats"] = {
                    "mean": round(float(clean.mean()), 4),
                    "median": round(float(clean.median()), 4),
                    "std": round(float(clean.std()), 4),
                    "min": float(clean.min()),
                    "max": float(clean.max()),
                    "q25": float(clean.quantile(0.25)),
                    "q75": float(clean.quantile(0.75)),
                    "skewness": round(float(clean.skew()), 4),
                    "kurtosis": round(float(clean.kurtosis()), 4),
                }
                # IQR-based outliers
                q1 = clean.quantile(0.25)
                q3 = clean.quantile(0.75)
                iqr = q3 - q1
                lower = q1 - 1.5 * iqr
                upper = q3 + 1.5 * iqr
                outlier_count = int(((clean < lower) | (clean > upper)).sum())
                col_info["outliers"] = {
                    "count": outlier_count,
                    "pct": round(outlier_count / max(len(clean), 1) * 100, 2),
                    "lower_bound": round(float(lower), 4),
                    "upper_bound": round(float(upper), 4),
                }
                # Histogram bins (10 bins)
                try:
                    counts, edges = np.histogram(clean, bins=min(20, max(5, unique_count)), range=(clean.min(), clean.max()))
                    col_info["histogram"] = {
                        "counts": counts.tolist(),
                        "edges": [round(float(e), 4) for e in edges.tolist()],
                    }
                except Exception:
                    pass
        else:
            # Categorical column
            vc = series.value_counts().head(15)
            col_info["value_counts"] = {str(k): int(v) for k, v in vc.items()}

        result["columns"][col] = col_info

        if null_count > 0:
            result["missing_summary"][col] = {"count": null_count, "pct": null_pct}

    # Correlation matrix for numeric columns
    numeric_df = df.select_dtypes(include="number")
    if len(numeric_df.columns) > 1:
        corr = numeric_df.corr().round(4).fillna(0)
        result["correlations"] = {
            "columns": list(corr.columns),
            "matrix": corr.values.tolist(),
        }

    # Descriptive stats
    try:
        desc = df.describe(include="all").fillna("").round(4)
        result["numeric_stats"] = desc.to_dict()
    except Exception:
        pass

    return result


def get_sample_data(df: pd.DataFrame, rows: int = 50) -> dict[str, Any]:
    """Get sample rows from a DataFrame."""
    sample = df.head(rows).copy()
    # Convert timestamps to strings for JSON serialization
    for col in sample.select_dtypes(include=["datetime64"]).columns:
        sample[col] = sample[col].astype(str)

    return {
        "columns": list(df.columns),
        "dtypes": {col: str(df[col].dtype) for col in df.columns},
        "total_rows": len(df),
        "total_columns": len(df.columns),
        "data": sample.fillna("").to_dict(orient="records"),
    }
