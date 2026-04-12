"""Explainability service — feature importances for sklearn models."""
import io
import base64
import asyncio
import pickle
from typing import Any
import numpy as np
import pandas as pd

from app.models.models import MLModel
from app.services.storage_service import StorageService
from app.core.config import settings
from app.schemas.schemas import SHAPGlobalResponse, SHAPLocalResponse, TokenImportanceResponse


class ExplainabilityService:
    def __init__(self):
        self._storage = None

    async def _get_storage(self):
        if self._storage is None:
            self._storage = await StorageService.get_instance()
        return self._storage

    async def _load_model(self, model_obj: MLModel):
        storage = await self._get_storage()
        artifact_bytes = await storage.download_bytes(
            settings.MINIO_BUCKET_MODELS, model_obj.artifact_path
        )
        return pickle.loads(artifact_bytes)

    async def shap_global(self, model_obj: MLModel, sample_size: int = 100) -> SHAPGlobalResponse:
        """Compute global feature importances for sklearn models."""

        model = await self._load_model(model_obj)

        def _compute():
            feature_names = []
            importances = []

            # Try feature_importances_ (tree-based models)
            if hasattr(model, "feature_importances_"):
                importances = model.feature_importances_.tolist()
                if hasattr(model, "feature_names_in_"):
                    feature_names = list(model.feature_names_in_)
                else:
                    feature_names = [f"feature_{i}" for i in range(len(importances))]

            # Try coef_ (linear models)
            elif hasattr(model, "coef_"):
                coef = model.coef_
                if coef.ndim > 1:
                    coef = np.abs(coef).mean(axis=0)
                else:
                    coef = np.abs(coef)
                importances = coef.tolist()
                if hasattr(model, "feature_names_in_"):
                    feature_names = list(model.feature_names_in_)
                else:
                    feature_names = [f"feature_{i}" for i in range(len(importances))]

            else:
                # Fallback
                if hasattr(model, "feature_names_in_"):
                    feature_names = list(model.feature_names_in_)
                importances = [0.0] * len(feature_names)

            return SHAPGlobalResponse(
                feature_names=feature_names,
                mean_abs_shap=importances,
                shap_values_sample=None,
            )

        return await asyncio.get_event_loop().run_in_executor(None, _compute)

    async def shap_local(self, model_obj: MLModel, inputs: dict) -> SHAPLocalResponse:
        """Compute per-instance feature importance approximation."""

        model = await self._load_model(model_obj)

        def _compute():
            df = pd.DataFrame([inputs])
            for col in df.columns:
                try:
                    df[col] = pd.to_numeric(df[col])
                except (ValueError, TypeError):
                    df[col] = df[col].astype("category").cat.codes

            pred = model.predict(df)[0]
            pred_str = str(pred)

            feature_names = list(df.columns)
            importances = [0.0] * len(feature_names)
            base_value = 0.0

            # Use feature_importances_ as proxy
            if hasattr(model, "feature_importances_"):
                fi = model.feature_importances_
                if len(fi) == len(feature_names):
                    importances = fi.tolist()
            elif hasattr(model, "coef_"):
                coef = model.coef_
                if coef.ndim > 1:
                    coef = np.abs(coef).mean(axis=0)
                else:
                    coef = np.abs(coef)
                if len(coef) == len(feature_names):
                    importances = coef.tolist()

            return SHAPLocalResponse(
                feature_names=feature_names,
                base_value=base_value,
                shap_values=importances,
                prediction=pred_str,
            )

        return await asyncio.get_event_loop().run_in_executor(None, _compute)

    async def gradcam(self, model_obj: MLModel, image_bytes: bytes) -> dict:
        """Grad-CAM not available for sklearn models."""
        return {
            "error": "Grad-CAM is only available for deep learning image models.",
            "prediction": "N/A",
        }

    async def token_importance(self, model_obj: MLModel, text: str) -> TokenImportanceResponse:
        """Token importance not available for sklearn models."""
        return TokenImportanceResponse(
            tokens=[text],
            importances=[1.0],
            prediction="N/A",
        )
