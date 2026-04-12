"""Public user profiles — /api/v1/profiles/"""
import uuid
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.models.models import User, Dataset, MLModel, Notebook, Activity

router = APIRouter(prefix="/profiles", tags=["Profiles"])


class PublicProfile(BaseModel):
    id: uuid.UUID
    username: Optional[str]
    full_name: Optional[str]
    avatar_url: Optional[str]
    bio: Optional[str]
    website: Optional[str]
    github_url: Optional[str]
    kaggle_url: Optional[str]
    followers_count: int
    following_count: int
    is_public: bool
    created_at: datetime
    datasets_count: int = 0
    models_count: int = 0
    notebooks_count: int = 0


class PublicDataset(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    dataset_type: str
    star_count: int
    fork_count: int
    download_count: int
    tags: List[str]
    created_at: datetime


class PublicModel(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    task_type: str
    framework: str
    star_count: int
    fork_count: int
    tags: List[str]
    created_at: datetime


class PublicNotebook(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str]
    star_count: int
    fork_count: int
    tags: List[str]
    created_at: datetime


class ActivityItem(BaseModel):
    id: uuid.UUID
    action: str
    resource_type: Optional[str]
    resource_id: Optional[uuid.UUID]
    created_at: datetime


async def _get_user_by_username(username: str) -> User:
    user = await User.find_one(User.username == username)
    if not user:
        raise HTTPException(404, "User not found")
    if not user.is_public:
        raise HTTPException(403, "This profile is private")
    return user


@router.get("/{username}", response_model=PublicProfile)
async def get_profile(username: str):
    user = await _get_user_by_username(username)
    ds_count = await Dataset.find(Dataset.owner_id == user.id, Dataset.is_public == True).count()
    m_count = await MLModel.find(MLModel.owner_id == user.id, MLModel.is_public == True).count()
    nb_count = await Notebook.find(Notebook.owner_id == user.id, Notebook.is_public == True).count()
    return PublicProfile(
        id=user.id, username=user.username, full_name=user.full_name,
        avatar_url=user.avatar_url, bio=user.bio, website=user.website,
        github_url=user.github_url, kaggle_url=user.kaggle_url,
        followers_count=user.followers_count, following_count=user.following_count,
        is_public=user.is_public, created_at=user.created_at,
        datasets_count=ds_count, models_count=m_count, notebooks_count=nb_count,
    )


@router.get("/{username}/datasets", response_model=List[PublicDataset])
async def get_profile_datasets(username: str):
    user = await _get_user_by_username(username)
    return await Dataset.find(Dataset.owner_id == user.id, Dataset.is_public == True).sort(-Dataset.created_at).to_list()


@router.get("/{username}/models", response_model=List[PublicModel])
async def get_profile_models(username: str):
    user = await _get_user_by_username(username)
    return await MLModel.find(MLModel.owner_id == user.id, MLModel.is_public == True).sort(-MLModel.created_at).to_list()


@router.get("/{username}/notebooks", response_model=List[PublicNotebook])
async def get_profile_notebooks(username: str):
    user = await _get_user_by_username(username)
    return await Notebook.find(Notebook.owner_id == user.id, Notebook.is_public == True).sort(-Notebook.created_at).to_list()


@router.get("/{username}/activity", response_model=List[ActivityItem])
async def get_profile_activity(username: str):
    user = await _get_user_by_username(username)
    return await Activity.find(Activity.user_id == user.id).sort(-Activity.created_at).limit(30).to_list()
