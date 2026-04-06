"""Inference routes — /api/v1/inference/"""
import uuid
import time
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
import io

from app.models.models import User, MLModel, ModelStage
from app.schemas.schemas import PredictionRequest, PredictionResponse
from app.api.v1.auth import get_current_user
from app.services.inference_service import InferenceService

router = APIRouter(prefix="/inference", tags=["Inference"])

_inference_service: InferenceService | None = None

def get_inference_service() -> InferenceService:
    global _inference_service
    if _inference_service is None:
        _inference_service = InferenceService()
    return _inference_service


@router.get("/{model_id}/predict/schema")
async def get_input_schema(
    model_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
):
    """Return the expected input schema for this model."""
    model = await MLModel.find_one(MLModel.id == model_id, MLModel.owner_id == current_user.id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return model.input_schema or {}


@router.post("/{model_id}/predict", response_model=PredictionResponse)
async def predict(
    model_id: uuid.UUID,
    body: PredictionRequest,
    current_user: User = Depends(get_current_user),
    svc: InferenceService = Depends(get_inference_service),
):
    """Run a single prediction against a trained model."""
    model_obj = await MLModel.find_one(MLModel.id == model_id, MLModel.owner_id == current_user.id)
    if not model_obj:
        raise HTTPException(status_code=404, detail="Model not found")

    start = time.monotonic()
    try:
        output = await svc.predict(model_obj, body.inputs)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Inference error: {str(exc)}") from exc

    latency_ms = (time.monotonic() - start) * 1000
    return PredictionResponse(
        prediction=output.get("prediction"),
        confidence=output.get("confidence"),
        class_probabilities=output.get("class_probabilities"),
        latency_ms=round(latency_ms, 2),
    )


@router.post("/{model_id}/predict/batch")
async def batch_predict(
    model_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    svc: InferenceService = Depends(get_inference_service),
):
    """Run batch predictions on a CSV or image zip and return enriched CSV."""
    model_obj = await MLModel.find_one(MLModel.id == model_id, MLModel.owner_id == current_user.id)
    if not model_obj:
        raise HTTPException(status_code=404, detail="Model not found")

    content = await file.read()
    try:
        output_bytes = await svc.batch_predict(model_obj, content, file.filename or "")
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Batch inference error: {str(exc)}") from exc

    return StreamingResponse(
        io.BytesIO(output_bytes),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=predictions_{model_id}.csv"},
    )
