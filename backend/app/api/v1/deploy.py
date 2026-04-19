"""Deployment routes — /api/v1/deploy/"""
import uuid
import secrets
from fastapi import APIRouter, Depends, HTTPException
from app.models.models import User, MLModel, ModelStage, Deployment, APIKey
from app.schemas.schemas import DeploymentOut, APIKeyOut
from app.api.v1.auth import get_current_user, get_verified_user
from app.core.security import hash_api_key
from app.services.quota_service import check_quota, increment_usage
from app.core.config import settings

router = APIRouter(prefix="/deploy", tags=["Deployment"])


@router.post("/{model_id}/api", response_model=DeploymentOut, status_code=201)
async def deploy_model(
    model_id: uuid.UUID,
    current_user: User = Depends(get_verified_user),
):
    """Generate and activate a REST API endpoint for the model."""
    # Check deployment quota
    await check_quota(current_user.id, "deployments")

    model_obj = await MLModel.find_one(MLModel.id == model_id, MLModel.owner_id == current_user.id)
    if not model_obj:
        raise HTTPException(status_code=404, detail="Model not found")
    if model_obj.stage not in (ModelStage.staging, ModelStage.production):
        raise HTTPException(
            status_code=400,
            detail=f"Model must be in staging or production stage (current: {model_obj.stage.value})"
        )

    # Generate endpoint URL
    endpoint_url = f"/serve/{current_user.slug}/{model_obj.slug}/predict"

    # Check for existing active deployment
    existing_dep = await Deployment.find_one(Deployment.model_id == model_id, Deployment.is_active == True)
    if existing_dep:
        return existing_dep

    deployment = Deployment(
        model_id=model_id,
        endpoint_url=endpoint_url,
        is_active=True,
    )
    await deployment.insert()

    # Auto-generate initial API key
    raw_key = f"sk-{secrets.token_urlsafe(32)}"
    api_key = APIKey(
        model_id=model_id,
        owner_id=current_user.id,
        name="Default Key",
        key_hash=hash_api_key(raw_key),
    )
    await api_key.insert()
    return deployment


@router.get("/{model_id}/api", response_model=DeploymentOut)
async def get_deployment(
    model_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
):
    """Get deployment status and endpoint URL."""
    # First verify ownership
    model_obj = await MLModel.find_one(MLModel.id == model_id, MLModel.owner_id == current_user.id)
    if not model_obj:
        raise HTTPException(status_code=404, detail="No active deployment found for this model")

    deployment = await Deployment.find_one(Deployment.model_id == model_id, Deployment.is_active == True)
    if not deployment:
        raise HTTPException(status_code=404, detail="No active deployment found for this model")
    return deployment


@router.delete("/{model_id}/api", status_code=204)
async def undeploy_model(
    model_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
):
    """Deactivate the model's REST API endpoint."""
    model_obj = await MLModel.find_one(MLModel.id == model_id, MLModel.owner_id == current_user.id)
    if not model_obj:
        raise HTTPException(status_code=404, detail="No active deployment found")

    deployment = await Deployment.find_one(Deployment.model_id == model_id, Deployment.is_active == True)
    if not deployment:
        raise HTTPException(status_code=404, detail="No active deployment found")
    
    deployment.is_active = False
    await deployment.save()


@router.get("/{model_id}/api/usage")
async def get_usage(
    model_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
):
    """Usage stats: requests, latency, errors."""
    from app.models.models import InferenceLog

    model_obj = await MLModel.find_one(MLModel.id == model_id, MLModel.owner_id == current_user.id)
    if not model_obj:
        raise HTTPException(status_code=404, detail="Deployment not found")

    deployment = await Deployment.find_one(Deployment.model_id == model_id)
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")

    pipeline = [
        {"$match": {"deployment_id": deployment.id}},
        {"$group": {
            "_id": None,
            "total": {"$sum": 1},
            "avg_latency": {"$avg": "$latency_ms"},
            "errors": {"$sum": {"$cond": [{"$gte": ["$status_code", 400]}, 1, 0]}}
        }}
    ]
    
    # Motor aggregation
    cursor = InferenceLog.get_motor_collection().aggregate(pipeline)
    results = await cursor.to_list(length=1)
    
    row = results[0] if results else {"total": 0, "avg_latency": 0, "errors": 0}
    
    return {
        "total_requests": row.get("total", 0),
        "avg_latency_ms": round(row.get("avg_latency", 0) or 0, 2),
        "p50_latency_ms": 0,  # Note: true percentiles require complex aggregations in Mongo, simplified here
        "p95_latency_ms": 0,
        "error_count": row.get("errors", 0),
        "error_rate": round(row.get("errors", 0) / max(row.get("total", 0) or 1, 1), 4),
    }


@router.post("/{model_id}/export")
async def export_model(
    model_id: uuid.UUID,
    format: str = "onnx",  # onnx | pickle | docker
    current_user: User = Depends(get_current_user),
):
    """Export a model in the requested format."""
    model_obj = await MLModel.find_one(MLModel.id == model_id, MLModel.owner_id == current_user.id)
    if not model_obj:
        raise HTTPException(status_code=404, detail="Model not found")
    if format not in ("onnx", "pickle", "docker"):
        raise HTTPException(status_code=400, detail="Format must be one of: onnx, pickle, docker")

    # Return download URL (pre-signed MinIO URL)
    from app.services.storage_service import StorageService
    storage = await StorageService.get_instance()
    if format == "onnx" and model_obj.onnx_path:
        url = await storage.presigned_url(settings.R2_BUCKET_MODELS, model_obj.onnx_path)
    else:
        url = await storage.presigned_url(settings.R2_BUCKET_MODELS, model_obj.artifact_path)

    return {"download_url": url, "format": format, "expires_in_seconds": 3600}


# ── API Key Management ────────────────────────────────────────────────────────

@router.get("/keys/all")
async def list_all_api_keys(
    current_user: User = Depends(get_current_user),
):
    """List all API keys owned by the current user (across all models)."""
    keys = await APIKey.find(APIKey.owner_id == current_user.id).to_list()

    # Batch lookup model names
    model_ids = list(set(k.model_id for k in keys))
    models = await MLModel.find({"_id": {"$in": model_ids}}).to_list()
    model_names = {m.id: m.name for m in models}

    result = []
    for k in keys:
        result.append({
            "id": str(k.id),
            "name": k.name,
            "model_id": str(k.model_id),
            "model_name": model_names.get(k.model_id, "Unknown"),
            "is_active": k.is_active,
            "key_prefix": k.key_hash[:12] if k.key_hash else "",
            "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
            "created_at": k.created_at.isoformat(),
        })

    return result


@router.post("/keys/{key_id}/regenerate", response_model=APIKeyOut)
async def regenerate_api_key(
    key_id: uuid.UUID,
    current_user: User = Depends(get_verified_user),
):
    """Revoke an existing key and create a replacement with the same name."""
    old_key = await APIKey.find_one(
        APIKey.id == key_id,
        APIKey.owner_id == current_user.id,
    )
    if not old_key:
        raise HTTPException(status_code=404, detail="API key not found")
    if not old_key.is_active:
        raise HTTPException(status_code=400, detail="Key is already revoked")

    # Deactivate old key
    old_key.is_active = False
    await old_key.save()

    # Create replacement
    raw_key = f"sk-{secrets.token_urlsafe(32)}"
    new_key = APIKey(
        model_id=old_key.model_id,
        owner_id=current_user.id,
        name=old_key.name,
        key_hash=hash_api_key(raw_key),
    )
    await new_key.insert()

    key_out = APIKeyOut.model_validate(new_key)
    key_out.raw_key = raw_key
    return key_out


@router.post("/{model_id}/keys", response_model=APIKeyOut, status_code=201)
async def create_api_key(
    model_id: uuid.UUID,
    name: str = "New Key",
    current_user: User = Depends(get_verified_user),
):
    """Generate a new API key for a deployed model."""
    raw_key = f"sk-{secrets.token_urlsafe(32)}"
    api_key = APIKey(
        model_id=model_id,
        owner_id=current_user.id,
        name=name,
        key_hash=hash_api_key(raw_key),
    )
    await api_key.insert()
    key_out = APIKeyOut.model_validate(api_key)
    key_out.raw_key = raw_key  # only returned once
    return key_out


@router.delete("/{model_id}/keys/{key_id}", status_code=204)
async def revoke_api_key(
    model_id: uuid.UUID,
    key_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
):
    """Revoke an API key."""
    api_key = await APIKey.find_one(
        APIKey.id == key_id,
        APIKey.model_id == model_id,
        APIKey.owner_id == current_user.id,
    )
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    api_key.is_active = False
    await api_key.save()
