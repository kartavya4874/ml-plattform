"""Social graph routes — /api/v1/social/"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.models.models import (
    User, Star, Follow, Fork, Activity,
    Dataset, MLModel, Notebook, UserRole,
)
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/social", tags=["Social"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class StarOut(BaseModel):
    id: uuid.UUID
    resource_type: str
    resource_id: uuid.UUID
    created_at: datetime

class FollowOut(BaseModel):
    id: uuid.UUID
    follower_id: uuid.UUID
    following_id: uuid.UUID
    created_at: datetime

class ActivityOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    action: str
    resource_type: Optional[str]
    resource_id: Optional[uuid.UUID]
    target_user_id: Optional[uuid.UUID]
    metadata: Optional[dict]
    created_at: datetime

class UserCard(BaseModel):
    id: uuid.UUID
    username: Optional[str]
    full_name: Optional[str]
    avatar_url: Optional[str]
    bio: Optional[str]


RESOURCE_MODEL_MAP = {
    "dataset": Dataset,
    "model": MLModel,
    "notebook": Notebook,
}


async def _log_activity(user_id, action, resource_type=None, resource_id=None, target_user_id=None, meta=None):
    a = Activity(user_id=user_id, action=action, resource_type=resource_type,
                 resource_id=resource_id, target_user_id=target_user_id, metadata=meta)
    await a.insert()


# ── Stars ────────────────────────────────────────────────────────────────────

@router.post("/star/{resource_type}/{resource_id}")
async def toggle_star(resource_type: str, resource_id: uuid.UUID, current_user: User = Depends(get_current_user)):
    """Star or unstar a resource."""
    if resource_type not in RESOURCE_MODEL_MAP:
        raise HTTPException(400, "Invalid resource type")

    existing = await Star.find_one(
        Star.user_id == current_user.id,
        Star.resource_type == resource_type,
        Star.resource_id == resource_id,
    )
    model_cls = RESOURCE_MODEL_MAP[resource_type]
    resource = await model_cls.get(resource_id)
    if not resource:
        raise HTTPException(404, "Resource not found")

    if existing:
        await existing.delete()
        resource.star_count = max(0, resource.star_count - 1)
        await resource.save()
        return {"starred": False, "star_count": resource.star_count}
    else:
        await Star(user_id=current_user.id, resource_type=resource_type, resource_id=resource_id).insert()
        resource.star_count += 1
        await resource.save()
        await _log_activity(current_user.id, "starred", resource_type, resource_id)
        return {"starred": True, "star_count": resource.star_count}


@router.get("/stars", response_model=List[StarOut])
async def get_my_stars(current_user: User = Depends(get_current_user)):
    return await Star.find(Star.user_id == current_user.id).sort(-Star.created_at).to_list()


@router.get("/starred/{resource_type}/{resource_id}")
async def check_starred(resource_type: str, resource_id: uuid.UUID, current_user: User = Depends(get_current_user)):
    s = await Star.find_one(Star.user_id == current_user.id, Star.resource_type == resource_type, Star.resource_id == resource_id)
    return {"starred": s is not None}


# ── Follows ──────────────────────────────────────────────────────────────────

@router.post("/follow/{user_id}")
async def toggle_follow(user_id: uuid.UUID, current_user: User = Depends(get_current_user)):
    if user_id == current_user.id:
        raise HTTPException(400, "Cannot follow yourself")
    target = await User.get(user_id)
    if not target:
        raise HTTPException(404, "User not found")

    existing = await Follow.find_one(Follow.follower_id == current_user.id, Follow.following_id == user_id)
    if existing:
        await existing.delete()
        target.followers_count = max(0, target.followers_count - 1)
        current_user.following_count = max(0, current_user.following_count - 1)
        await target.save()
        await current_user.save()
        return {"following": False}
    else:
        await Follow(follower_id=current_user.id, following_id=user_id).insert()
        target.followers_count += 1
        current_user.following_count += 1
        await target.save()
        await current_user.save()
        await _log_activity(current_user.id, "followed", target_user_id=user_id)
        return {"following": True}


@router.get("/followers/{user_id}", response_model=List[UserCard])
async def get_followers(user_id: uuid.UUID):
    follows = await Follow.find(Follow.following_id == user_id).to_list()
    ids = [f.follower_id for f in follows]
    users = await User.find({"_id": {"$in": ids}}).to_list()
    return [UserCard(id=u.id, username=u.username, full_name=u.full_name, avatar_url=u.avatar_url, bio=u.bio) for u in users]


@router.get("/following/{user_id}", response_model=List[UserCard])
async def get_following(user_id: uuid.UUID):
    follows = await Follow.find(Follow.follower_id == user_id).to_list()
    ids = [f.following_id for f in follows]
    users = await User.find({"_id": {"$in": ids}}).to_list()
    return [UserCard(id=u.id, username=u.username, full_name=u.full_name, avatar_url=u.avatar_url, bio=u.bio) for u in users]


@router.get("/is-following/{user_id}")
async def check_following(user_id: uuid.UUID, current_user: User = Depends(get_current_user)):
    f = await Follow.find_one(Follow.follower_id == current_user.id, Follow.following_id == user_id)
    return {"following": f is not None}


# ── Forks ────────────────────────────────────────────────────────────────────

@router.post("/fork/{resource_type}/{resource_id}")
async def fork_resource(resource_type: str, resource_id: uuid.UUID, current_user: User = Depends(get_current_user)):
    if resource_type not in RESOURCE_MODEL_MAP:
        raise HTTPException(400, "Invalid resource type")

    model_cls = RESOURCE_MODEL_MAP[resource_type]
    original = await model_cls.get(resource_id)
    if not original:
        raise HTTPException(404, "Resource not found")
    if not original.is_public and original.owner_id != current_user.id:
        raise HTTPException(403, "Cannot fork a private resource")

    # Idempotency check: Prevent double-forking if the UI double-posts or user clicks quickly
    existing_fork = await Fork.find_one(
        Fork.original_id == resource_id,
        Fork.forked_by == current_user.id
    )
    if existing_fork:
        # Verify the forked resource wasn't deleted by the user previously
        exists = await model_cls.get(existing_fork.forked_id)
        if exists:
            return {"forked_id": str(exists.id), "message": "Already forked"}
        # If it was deleted, allow re-forking by continuing

    # Create a copy based on type
    if resource_type == "dataset":
        copy = Dataset(
            owner_id=current_user.id, name=f"{original.name} (fork)",
            description=original.description, readme=original.readme, tags=original.tags,
            dataset_type=original.dataset_type, file_size_bytes=original.file_size_bytes,
            row_count=original.row_count, column_count=original.column_count,
            minio_path=original.minio_path, status=original.status,
        )
        await copy.insert()
    elif resource_type == "notebook":
        copy = Notebook(
            owner_id=current_user.id, title=f"{original.title} (fork)",
            description=original.description, cells=original.cells, tags=original.tags,
        )
        await copy.insert()
    elif resource_type == "model":
        import re, time as _time
        fork_slug = re.sub(r'[^a-z0-9]+', '-', f"{original.name}-fork-{int(_time.time())}".lower()).strip('-')
        copy = MLModel(
            owner_id=current_user.id, name=f"{original.name} (fork)",
            description=original.description, task_type=original.task_type,
            framework=original.framework, tags=original.tags,
            artifact_path=original.artifact_path, stage=original.stage,
            metrics=original.metrics, training_job_id=original.training_job_id,
            slug=fork_slug,
        )
        await copy.insert()
    else:
        raise HTTPException(400, "Unsupported resource type for forking")

    original.fork_count += 1
    await original.save()

    await Fork(original_id=resource_id, original_type=resource_type,
               forked_id=copy.id, forked_by=current_user.id).insert()
    await _log_activity(current_user.id, "forked", resource_type, resource_id)
    return {"forked_id": str(copy.id)}


# ── Activity Feed ────────────────────────────────────────────────────────────

@router.get("/activity/feed", response_model=List[ActivityOut])
async def get_activity_feed(current_user: User = Depends(get_current_user)):
    """Activity from users you follow."""
    follows = await Follow.find(Follow.follower_id == current_user.id).to_list()
    ids = [f.following_id for f in follows] + [current_user.id]
    return await Activity.find({"user_id": {"$in": ids}}).sort(-Activity.created_at).limit(50).to_list()


@router.get("/activity/{user_id}", response_model=List[ActivityOut])
async def get_user_activity(user_id: uuid.UUID):
    return await Activity.find(Activity.user_id == user_id).sort(-Activity.created_at).limit(50).to_list()
