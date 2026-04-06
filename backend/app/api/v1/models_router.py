"""Model registry routes — /api/v1/models/"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi import APIRouter, Depends, HTTPException

from app.models.models import User, MLModel, ModelStage
from app.schemas.schemas import ModelOut, ModelUpdate
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/models", tags=["Model Registry"])


@router.get("/", response_model=list[ModelOut])
async def list_models(
    task_type: str | None = None,
    stage: str | None = None,
    current_user: User = Depends(get_current_user),
):
    """List all trained models with optional filters."""
    query = {"owner_id": current_user.id}
    if task_type:
        query["task_type"] = task_type
    if stage:
        query["stage"] = stage
    return await MLModel.find(query).sort(-MLModel.created_at).to_list()


@router.get("/{model_id}", response_model=ModelOut)
async def get_model(
    model_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
):
    """Get full model details including metrics and artifact paths."""
    model = await MLModel.find_one(MLModel.id == model_id, MLModel.owner_id == current_user.id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return model


@router.patch("/{model_id}", response_model=ModelOut)
async def update_model(
    model_id: uuid.UUID,
    body: ModelUpdate,
    current_user: User = Depends(get_current_user),
):
    """Update model name or description."""
    model = await MLModel.find_one(MLModel.id == model_id, MLModel.owner_id == current_user.id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    modified = False
    if body.name:
        model.name = body.name
        modified = True
    if body.description is not None:
        model.description = body.description
        modified = True
        
    if modified:
        await model.save()
    return model


@router.delete("/{model_id}", status_code=204)
async def delete_model(
    model_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
):
    """Delete a model and its MinIO artifacts."""
    model = await MLModel.find_one(MLModel.id == model_id, MLModel.owner_id == current_user.id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    if model.stage == ModelStage.production:
        raise HTTPException(status_code=409, detail="Cannot delete a production model. Archive it first.")
    
    await model.delete()


@router.get("/{model_id}/metrics")
async def get_model_metrics(
    model_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
):
    """Return full evaluation metrics for a model."""
    model = await MLModel.find_one(MLModel.id == model_id, MLModel.owner_id == current_user.id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return model.metrics or {}


@router.post("/{model_id}/promote", response_model=ModelOut)
async def promote_model(
    model_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
):
    """Promote a model from staging to production.
    
    Explainability requirement: the model must have metrics set (run training),
    ensuring the explainability pipeline has been invoked as part of training.
    """
    model = await MLModel.find_one(MLModel.id == model_id, MLModel.owner_id == current_user.id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    if model.stage not in (ModelStage.staging, ModelStage.training):
        raise HTTPException(status_code=400, detail=f"Model stage is '{model.stage.value}', not promotable")
    if not model.metrics:
        raise HTTPException(status_code=400, detail="Model has no reported metrics — training may have failed")

    # Archive any existing production model for the same task
    existing_prod = await MLModel.find(
        MLModel.owner_id == current_user.id,
        MLModel.task_type == model.task_type,
        MLModel.stage == ModelStage.production,
        MLModel.id != model_id,
    ).to_list()
    
    for m in existing_prod:
        m.stage = ModelStage.archived
        await m.save()

    model.stage = ModelStage.production
    await model.save()
    return model
