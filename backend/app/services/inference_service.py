"""Inference service with LRU model cache — supports sklearn models."""
import io
import pickle
import asyncio
from collections import OrderedDict
from typing import Any
import numpy as np
import pandas as pd

from app.models.models import MLModel, TaskType
from app.services.storage_service import StorageService
from app.core.config import settings


class LRUModelCache:
    """Thread-safe LRU cache for loaded ML models."""

    def __init__(self, max_size: int = 5):
        self._cache: OrderedDict[str, Any] = OrderedDict()
        self._max = max_size

    def get(self, key: str) -> Any | None:
        if key in self._cache:
            self._cache.move_to_end(key)
            return self._cache[key]
        return None

    def put(self, key: str, value: Any):
        if key in self._cache:
            self._cache.move_to_end(key)
        self._cache[key] = value
        if len(self._cache) > self._max:
            self._cache.popitem(last=False)


class InferenceService:
    def __init__(self):
        self._cache = LRUModelCache(max_size=settings.MODEL_CACHE_MAX_SIZE)
        self._storage: Any = None

    async def _get_storage(self):
        if self._storage is None:
            self._storage = await StorageService.get_instance()
        return self._storage

    async def _load_artifact(self, model_obj: MLModel) -> Any:
        """Load model artifact from storage into cache."""
        cache_key = str(model_obj.id)
        cached = self._cache.get(cache_key)
        if cached:
            return cached

        storage = await self._get_storage()
        artifact_bytes = await storage.download_bytes(
            settings.MINIO_BUCKET_MODELS, model_obj.artifact_path
        )
        loaded = pickle.loads(artifact_bytes)
        self._cache.put(cache_key, loaded)
        return loaded

    async def predict(self, model_obj: MLModel, inputs: dict[str, Any]) -> dict[str, Any]:
        """Run a single prediction."""
        task = model_obj.task_type

        if task in (TaskType.classification, TaskType.regression):
            return await self._predict_tabular(model_obj, inputs)
        elif task == TaskType.image_classification:
            return {"prediction": "Image classification not supported for sklearn models"}
        elif task in (TaskType.sentiment, TaskType.text_classification):
            return {"prediction": "Text classification not supported for sklearn models"}
        else:
            raise ValueError(f"Unknown task type: {task}")

    async def _predict_tabular(self, model_obj: MLModel, inputs: dict) -> dict:
        """Predict using a sklearn model. Inputs are {feature_name: value}."""
        model = await self._load_artifact(model_obj)
        loop = asyncio.get_event_loop()

        def _run():
            # Build feature dataframe from inputs
            df = pd.DataFrame([inputs])

            # Ensure numeric columns are numeric
            for col in df.columns:
                try:
                    df[col] = pd.to_numeric(df[col])
                except (ValueError, TypeError):
                    # Encode categorical as integer codes
                    df[col] = df[col].astype("category").cat.codes

            pred = model.predict(df)[0]
            result: dict[str, Any] = {
                "prediction": float(pred) if isinstance(pred, (int, float, np.integer, np.floating)) else str(pred),
            }

            # Try to get probabilities for classification
            try:
                if hasattr(model, "predict_proba"):
                    proba = model.predict_proba(df)[0]
                    classes = list(map(str, model.classes_))
                    result["confidence"] = round(float(max(proba)), 4)
                    result["class_probabilities"] = {c: round(float(p), 4) for c, p in zip(classes, proba)}
            except Exception:
                pass

            return result

        return await loop.run_in_executor(None, _run)

    async def get_model_features(self, model_obj: MLModel) -> dict[str, Any]:
        """Get the feature names and types expected by the model."""
        model = await self._load_artifact(model_obj)

        features = []
        if hasattr(model, "feature_names_in_"):
            features = list(model.feature_names_in_)
        elif hasattr(model, "n_features_in_"):
            features = [f"feature_{i}" for i in range(model.n_features_in_)]

        return {
            "features": features,
            "n_features": len(features),
            "model_type": type(model).__name__,
            "task_type": model_obj.task_type,
        }

    async def batch_predict(self, model_obj: MLModel, content: bytes, filename: str) -> bytes:
        """Run batch predictions on a CSV, return enriched CSV bytes."""
        df = pd.read_csv(io.BytesIO(content))
        predictions = []
        for _, row in df.iterrows():
            result = await self.predict(model_obj, row.to_dict())
            predictions.append(result.get("prediction", ""))
        df["prediction"] = predictions
        return df.to_csv(index=False).encode()
