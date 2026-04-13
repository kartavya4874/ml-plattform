"""Tabular AutoML trainer using FLAML (lightweight, CPU-friendly)."""
import io
import pickle
import uuid
import pandas as pd
import numpy as np
from typing import Any, Callable
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import (
    accuracy_score, f1_score, roc_auc_score,
    mean_squared_error, r2_score, classification_report
)
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from flaml import AutoML
from app.services.storage_service import StorageService
from app.core.config import settings
import structlog
import asyncio

log = structlog.get_logger()
ProgressCb = Callable[[str, int], None]


def train_tabular(
    file_bytes: bytes,
    file_path: str,
    target_column: str,
    task_type: str,  # "classification" | "regression"
    config: dict,
    job_id: str,
    progress_cb: ProgressCb,
) -> dict[str, Any]:
    """
    Full tabular AutoML pipeline:
    1. Load & type-cast
    2. Impute + encode
    3. FLAML AutoML
    4. Evaluate on held-out test set
    5. Serialize & upload to MinIO
    """
    progress_cb("Loading dataset", 15)

    # ── Load ──────────────────────────────────────────────────────────────────
    if file_path.endswith(".xlsx") or file_path.endswith(".xls"):
        df = pd.read_excel(io.BytesIO(file_bytes))
    elif file_path.endswith(".parquet"):
        df = pd.read_parquet(io.BytesIO(file_bytes))
    else:
        df = pd.read_csv(io.BytesIO(file_bytes))

    if target_column not in df.columns:
        raise ValueError(f"Target column '{target_column}' not found in dataset")

    X = df.drop(columns=[target_column])
    y = df[target_column]

    # ── Type detection ────────────────────────────────────────────────────────
    numeric_cols = X.select_dtypes(include="number").columns.tolist()
    categorical_cols = X.select_dtypes(exclude="number").columns.tolist()

    progress_cb("Preprocessing features", 25)

    # ── Preprocessing pipeline ────────────────────────────────────────────────
    numeric_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])
    categorical_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])

    preprocessor = ColumnTransformer(transformers=[
        ("num", numeric_transformer, numeric_cols),
        ("cat", categorical_transformer, categorical_cols),
    ], remainder="drop")

    # ── Train/test split ──────────────────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42,
        stratify=y if task_type == "classification" else None
    )

    X_train_tf = preprocessor.fit_transform(X_train)
    X_test_tf = preprocessor.transform(X_test)

    progress_cb("Running AutoML (FLAML)", 35)

    # ── FLAML AutoML ──────────────────────────────────────────────────────────
    flaml_task = "classification" if task_type == "classification" else "regression"
    time_limit = config.get("time_limit_seconds", 120)

    automl = AutoML()
    automl.fit(
        X_train_tf, y_train,
        task=flaml_task,
        time_budget=time_limit,
        metric="auto",
        n_jobs=-1,
        estimator_list=["lgbm", "xgboost", "rf", "extra_tree"],
        verbose=0,
    )

    progress_cb("Evaluating model on test set", 75)

    # ── Evaluation ────────────────────────────────────────────────────────────
    y_pred = automl.predict(X_test_tf)
    metrics: dict[str, Any] = {}

    if task_type == "classification":
        metrics["accuracy"] = round(float(accuracy_score(y_test, y_pred)), 4)
        metrics["f1_weighted"] = round(float(f1_score(y_test, y_pred, average="weighted", zero_division=0)), 4)
        try:
            y_proba = automl.predict_proba(X_test_tf)
            if y_proba.shape[1] == 2:
                metrics["roc_auc"] = round(float(roc_auc_score(y_test, y_proba[:, 1])), 4)
        except Exception:
            pass
        report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
        metrics["classification_report"] = report
    else:
        mse = mean_squared_error(y_test, y_pred)
        metrics["rmse"] = round(float(np.sqrt(mse)), 4)
        metrics["r2"] = round(float(r2_score(y_test, y_pred)), 4)
        metrics["mse"] = round(float(mse), 4)

    metrics["best_estimator"] = str(automl.best_estimator)
    metrics["best_config"] = automl.best_config

    progress_cb("Serializing and uploading model", 85)

    # ── Serialize full pipeline ───────────────────────────────────────────────
    pipeline_obj = {
        "preprocessor": preprocessor,
        "automl": automl,
        "feature_names": X.columns.tolist(),
        "target_column": target_column,
        "task_type": task_type,
        "numeric_cols": numeric_cols,
        "categorical_cols": categorical_cols,
    }
    model_id = str(uuid.uuid4())
    artifact_path = f"tabular/{model_id}/pipeline.pkl"

    model_bytes = pickle.dumps(pipeline_obj)

    # Upload to MinIO (sync since we're in a thread executor)
    import asyncio as _asyncio
    loop = _asyncio.new_event_loop()
    storage = StorageService()
    loop.run_until_complete(
        storage.upload_bytes(settings.R2_BUCKET_MODELS, artifact_path, model_bytes, "application/octet-stream")
    )
    loop.close()

    # ── Input schema ──────────────────────────────────────────────────────────
    input_schema = {
        "features": [
            {"name": col, "type": "number" if col in numeric_cols else "string"}
            for col in X.columns.tolist()
        ],
        "target": target_column,
    }

    return {
        "metrics": metrics,
        "artifact_path": artifact_path,
        "input_schema": input_schema,
    }
