"""Admin panel routes — /api/v1/admin/ (Admin-only)"""
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime

from app.models.models import (
    User, UserRole, Dataset, MLModel, Notebook,
    Competition, Organization, Discussion,
    Subscription, SubscriptionTier,
)
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])


def _require_admin(user: User):
    if user.role != UserRole.admin:
        raise HTTPException(403, "Admin access required")


# ── Dashboard Stats ──────────────────────────────────────────────────────────

@router.get("/stats")
async def admin_stats(current_user: User = Depends(get_current_user)):
    _require_admin(current_user)
    return {
        "total_users": await User.count(),
        "total_datasets": await Dataset.count(),
        "total_models": await MLModel.count(),
        "total_notebooks": await Notebook.count(),
        "total_competitions": await Competition.count(),
        "total_organizations": await Organization.count(),
        "total_discussions": await Discussion.count(),
        "public_datasets": await Dataset.find(Dataset.is_public == True).count(),
        "public_models": await MLModel.find(MLModel.is_public == True).count(),
    }


# ── User Management ─────────────────────────────────────────────────────────

class AdminUserOut(BaseModel):
    id: uuid.UUID
    email: str
    full_name: Optional[str]
    username: Optional[str]
    role: str
    is_active: bool
    is_verified: bool
    created_at: datetime

class AdminUserUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None


@router.get("/users", response_model=List[AdminUserOut])
async def list_all_users(current_user: User = Depends(get_current_user)):
    _require_admin(current_user)
    return await User.find().sort(-User.created_at).to_list()


@router.patch("/users/{user_id}", response_model=AdminUserOut)
async def update_user(user_id: uuid.UUID, body: AdminUserUpdate, current_user: User = Depends(get_current_user)):
    _require_admin(current_user)
    user = await User.get(user_id)
    if not user:
        raise HTTPException(404, "User not found")

    if body.role is not None:
        user.role = UserRole(body.role)
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.is_verified is not None:
        user.is_verified = body.is_verified
    await user.save()
    return user


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(user_id: uuid.UUID, current_user: User = Depends(get_current_user)):
    _require_admin(current_user)
    user = await User.get(user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == current_user.id:
        raise HTTPException(400, "Cannot delete yourself")
    await user.delete()


# ── Content Moderation ───────────────────────────────────────────────────────

@router.get("/datasets", response_model=list)
async def list_all_datasets(current_user: User = Depends(get_current_user)):
    _require_admin(current_user)
    datasets = await Dataset.find().sort(-Dataset.created_at).limit(100).to_list()
    return [{"id": str(d.id), "name": d.name, "owner_id": str(d.owner_id),
             "is_public": d.is_public, "status": d.status, "created_at": d.created_at.isoformat()} for d in datasets]


@router.delete("/datasets/{dataset_id}", status_code=204)
async def admin_delete_dataset(dataset_id: uuid.UUID, current_user: User = Depends(get_current_user)):
    _require_admin(current_user)
    ds = await Dataset.get(dataset_id)
    if not ds:
        raise HTTPException(404, "Dataset not found")
    await ds.delete()


@router.get("/models", response_model=list)
async def list_all_models(current_user: User = Depends(get_current_user)):
    _require_admin(current_user)
    models = await MLModel.find().sort(-MLModel.created_at).limit(100).to_list()
    return [{"id": str(m.id), "name": m.name, "owner_id": str(m.owner_id),
             "is_public": m.is_public, "stage": m.stage.value, "created_at": m.created_at.isoformat()} for m in models]


@router.delete("/models/{model_id}", status_code=204)
async def admin_delete_model(model_id: uuid.UUID, current_user: User = Depends(get_current_user)):
    _require_admin(current_user)
    m = await MLModel.get(model_id)
    if not m:
        raise HTTPException(404, "Model not found")
    await m.delete()


@router.get("/discussions", response_model=list)
async def list_all_discussions(current_user: User = Depends(get_current_user)):
    _require_admin(current_user)
    discussions = await Discussion.find().sort(-Discussion.created_at).limit(100).to_list()
    return [{"id": str(d.id), "title": d.title, "author_id": str(d.author_id),
             "upvotes": d.upvotes, "created_at": d.created_at.isoformat()} for d in discussions]


@router.delete("/discussions/{discussion_id}", status_code=204)
async def admin_delete_discussion(discussion_id: uuid.UUID, current_user: User = Depends(get_current_user)):
    _require_admin(current_user)
    d = await Discussion.get(discussion_id)
    if not d:
        raise HTTPException(404, "Discussion not found")
    await d.delete()


# ── Subscription Management ─────────────────────────────────────────────────

@router.patch("/users/{user_id}/subscription")
async def admin_update_subscription(user_id: uuid.UUID, tier: str, current_user: User = Depends(get_current_user)):
    _require_admin(current_user)
    sub = await Subscription.find_one(Subscription.user_id == user_id)
    if not sub:
        raise HTTPException(404, "Subscription not found")
    sub.tier = SubscriptionTier(tier)
    await sub.save()
    return {"message": f"User subscription updated to {tier}"}
