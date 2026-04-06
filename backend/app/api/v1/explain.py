"""Explainability routes — /api/v1/explain/"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from app.models.models import User, MLModel, TaskType
from app.schemas.schemas import ExplainRequest, SHAPGlobalResponse, SHAPLocalResponse, TokenImportanceResponse
from app.api.v1.auth import get_current_user
from app.services.explainability_service import ExplainabilityService

router = APIRouter(prefix="/explain", tags=["Explainability"])
explain_service = ExplainabilityService()


async def _get_model(model_id: uuid.UUID, user: User) -> MLModel:
    model = await MLModel.find_one(MLModel.id == model_id, MLModel.owner_id == user.id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return model


@router.post("/{model_id}/shap", response_model=SHAPGlobalResponse)
async def global_shap(
    model_id: uuid.UUID,
    body: ExplainRequest,
    current_user: User = Depends(get_current_user),
):
    """Compute global SHAP feature importances for a tabular model."""
    model_obj = await _get_model(model_id, current_user)
    if model_obj.task_type not in (TaskType.classification, TaskType.regression):
        raise HTTPException(status_code=400, detail="SHAP global available for tabular models only")

    result = await explain_service.shap_global(model_obj, sample_size=body.sample_size)
    return result


@router.post("/{model_id}/shap/local", response_model=SHAPLocalResponse)
async def local_shap(
    model_id: uuid.UUID,
    body: ExplainRequest,
    current_user: User = Depends(get_current_user),
):
    """Compute per-instance SHAP explanation for a tabular model."""
    model_obj = await _get_model(model_id, current_user)
    if model_obj.task_type not in (TaskType.classification, TaskType.regression):
        raise HTTPException(status_code=400, detail="Local SHAP available for tabular models only")
    if not body.inputs:
        raise HTTPException(status_code=422, detail="inputs required for local SHAP")

    result = await explain_service.shap_local(model_obj, body.inputs)
    return result


@router.post("/{model_id}/gradcam")
async def gradcam(
    model_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Return a Grad-CAM heatmap overlay image (base64-encoded) for an image model."""
    model_obj = await _get_model(model_id, current_user)
    if model_obj.task_type != TaskType.image_classification:
        raise HTTPException(status_code=400, detail="Grad-CAM available for image classification only")

    image_bytes = await file.read()
    result = await explain_service.gradcam(model_obj, image_bytes)
    return result


@router.post("/{model_id}/token-importance", response_model=TokenImportanceResponse)
async def token_importance(
    model_id: uuid.UUID,
    body: ExplainRequest,
    current_user: User = Depends(get_current_user),
):
    """Compute token importance scores for an NLP model."""
    model_obj = await _get_model(model_id, current_user)
    if model_obj.task_type not in (TaskType.sentiment, TaskType.text_classification):
        raise HTTPException(status_code=400, detail="Token importance available for NLP models only")
    if not body.inputs or "text" not in body.inputs:
        raise HTTPException(status_code=422, detail="inputs.text required")

    result = await explain_service.token_importance(model_obj, body.inputs["text"])
    return result
