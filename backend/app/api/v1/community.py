"""Community Hub routes — /api/v1/community/ (search, trending, tags)"""
from typing import Optional, List
from fastapi import APIRouter, Query
from app.models.models import Dataset, MLModel, Notebook, User
from app.schemas.schemas import DatasetOut, ModelOut

router = APIRouter(prefix="/community", tags=["Community Hub"])


@router.get("/datasets", response_model=list[DatasetOut])
async def get_public_datasets():
    return await Dataset.find(Dataset.is_public == True).sort(-Dataset.created_at).to_list()


@router.get("/models", response_model=list[ModelOut])
async def get_public_models():
    return await MLModel.find(MLModel.is_public == True).sort(-MLModel.created_at).to_list()


@router.get("/search")
async def unified_search(
    q: str = Query("", min_length=0),
    type: Optional[str] = None,
    tags: Optional[str] = None,
    sort: Optional[str] = "recent",
):
    """Unified search across datasets, models, notebooks, and users."""
    tag_list = [t.strip() for t in tags.split(",")] if tags else []
    results = {"datasets": [], "models": [], "notebooks": [], "users": []}

    if not type or type == "dataset":
        query = {"is_public": True}
        if q:
            query["name"] = {"$regex": q, "$options": "i"}
        if tag_list:
            query["tags"] = {"$in": tag_list}
        ds = await Dataset.find(query).sort(-Dataset.star_count if sort == "stars" else -Dataset.created_at).limit(50).to_list()
        results["datasets"] = [
            {"id": str(d.id), "name": d.name, "description": d.description,
             "dataset_type": d.dataset_type.value, "tags": d.tags,
             "star_count": d.star_count, "fork_count": d.fork_count,
             "download_count": d.download_count, "created_at": d.created_at.isoformat()}
            for d in ds
        ]

    if not type or type == "model":
        query = {"is_public": True}
        if q:
            query["name"] = {"$regex": q, "$options": "i"}
        if tag_list:
            query["tags"] = {"$in": tag_list}
        ms = await MLModel.find(query).sort(-MLModel.star_count if sort == "stars" else -MLModel.created_at).limit(50).to_list()
        results["models"] = [
            {"id": str(m.id), "name": m.name, "description": m.description,
             "task_type": m.task_type.value, "framework": m.framework.value,
             "tags": m.tags, "star_count": m.star_count, "fork_count": m.fork_count,
             "created_at": m.created_at.isoformat()}
            for m in ms
        ]

    if not type or type == "notebook":
        query = {"is_public": True}
        if q:
            query["title"] = {"$regex": q, "$options": "i"}
        if tag_list:
            query["tags"] = {"$in": tag_list}
        nbs = await Notebook.find(query).sort(-Notebook.star_count if sort == "stars" else -Notebook.created_at).limit(50).to_list()
        results["notebooks"] = [
            {"id": str(n.id), "title": n.title, "description": n.description,
             "tags": n.tags, "star_count": n.star_count, "fork_count": n.fork_count,
             "created_at": n.created_at.isoformat()}
            for n in nbs
        ]

    if not type or type == "user":
        query = {"is_public": True}
        if q:
            query["$or"] = [
                {"username": {"$regex": q, "$options": "i"}},
                {"full_name": {"$regex": q, "$options": "i"}},
            ]
        users = await User.find(query).sort(-User.followers_count).limit(30).to_list()
        results["users"] = [
            {"id": str(u.id), "username": u.username, "full_name": u.full_name,
             "avatar_url": u.avatar_url, "bio": u.bio,
             "followers_count": u.followers_count}
            for u in users
        ]

    return results


@router.get("/trending")
async def get_trending():
    """Top resources by star count."""
    ds = await Dataset.find(Dataset.is_public == True).sort(-Dataset.star_count).limit(10).to_list()
    ms = await MLModel.find(MLModel.is_public == True).sort(-MLModel.star_count).limit(10).to_list()
    nbs = await Notebook.find(Notebook.is_public == True).sort(-Notebook.star_count).limit(10).to_list()
    return {
        "datasets": [{"id": str(d.id), "name": d.name, "star_count": d.star_count, "tags": d.tags} for d in ds],
        "models": [{"id": str(m.id), "name": m.name, "star_count": m.star_count, "tags": m.tags} for m in ms],
        "notebooks": [{"id": str(n.id), "title": n.title, "star_count": n.star_count, "tags": n.tags} for n in nbs],
    }


@router.get("/tags")
async def get_popular_tags():
    """Aggregate popular tags across all resource types."""
    # Simple approach: gather all tags
    all_tags = {}
    for d in await Dataset.find(Dataset.is_public == True).to_list():
        for t in d.tags:
            all_tags[t] = all_tags.get(t, 0) + 1
    for m in await MLModel.find(MLModel.is_public == True).to_list():
        for t in m.tags:
            all_tags[t] = all_tags.get(t, 0) + 1
    for n in await Notebook.find(Notebook.is_public == True).to_list():
        for t in n.tags:
            all_tags[t] = all_tags.get(t, 0) + 1

    sorted_tags = sorted(all_tags.items(), key=lambda x: x[1], reverse=True)[:30]
    return [{"tag": t, "count": c} for t, c in sorted_tags]
