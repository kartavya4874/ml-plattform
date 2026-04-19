"""Competitions routes — /api/v1/competitions/ (Admin-only creation)"""
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime

from app.models.models import User, Competition, Submission, UserRole, Activity
from app.api.v1.auth import get_current_user, get_verified_user

router = APIRouter(prefix="/competitions", tags=["Competitions"])


class CompetitionCreate(BaseModel):
    title: str
    description: str
    rules: Optional[str] = None
    dataset_id: uuid.UUID
    metric: str = "accuracy"
    higher_is_better: bool = True
    deadline: Optional[datetime] = None
    max_submissions_per_day: int = 5
    tags: List[str] = []
    prize_description: Optional[str] = None

class CompetitionOut(BaseModel):
    id: uuid.UUID
    created_by: uuid.UUID
    title: str
    description: str
    rules: Optional[str]
    dataset_id: uuid.UUID
    metric: str
    higher_is_better: bool
    deadline: Optional[datetime]
    max_submissions_per_day: int
    is_active: bool
    tags: List[str]
    participant_count: int
    prize_description: Optional[str]
    created_at: datetime

class SubmissionCreate(BaseModel):
    model_id: Optional[uuid.UUID] = None
    score: float

class SubmissionOut(BaseModel):
    id: uuid.UUID
    competition_id: uuid.UUID
    user_id: uuid.UUID
    model_id: Optional[uuid.UUID]
    score: float
    status: str
    created_at: datetime

class LeaderboardEntry(BaseModel):
    rank: int
    user_id: uuid.UUID
    username: Optional[str]
    avatar_url: Optional[str]
    score: float
    submissions: int
    last_submission: datetime


def _require_admin(user: User):
    if user.role != UserRole.admin:
        raise HTTPException(403, "Admin access required")


@router.post("", response_model=CompetitionOut, status_code=201)
async def create_competition(body: CompetitionCreate, current_user: User = Depends(get_verified_user)):
    _require_admin(current_user)
    comp = Competition(
        created_by=current_user.id, title=body.title, description=body.description,
        rules=body.rules, dataset_id=body.dataset_id, metric=body.metric,
        higher_is_better=body.higher_is_better, deadline=body.deadline,
        max_submissions_per_day=body.max_submissions_per_day, tags=body.tags,
        prize_description=body.prize_description,
    )
    await comp.insert()
    return comp


@router.get("", response_model=List[CompetitionOut])
async def list_competitions():
    return await Competition.find().sort(-Competition.created_at).to_list()


@router.get("/{comp_id}", response_model=CompetitionOut)
async def get_competition(comp_id: uuid.UUID):
    comp = await Competition.get(comp_id)
    if not comp:
        raise HTTPException(404, "Competition not found")
    return comp


@router.post("/{comp_id}/submit", response_model=SubmissionOut)
async def submit_entry(comp_id: uuid.UUID, body: SubmissionCreate, current_user: User = Depends(get_verified_user)):
    comp = await Competition.get(comp_id)
    if not comp:
        raise HTTPException(404, "Competition not found")
    if not comp.is_active:
        raise HTTPException(400, "Competition is closed")
    if comp.deadline and datetime.utcnow() > comp.deadline:
        raise HTTPException(400, "Deadline has passed")

    sub = Submission(
        competition_id=comp_id, user_id=current_user.id,
        model_id=body.model_id, score=body.score, status="scored",
    )
    await sub.insert()

    # Update participant count
    unique = await Submission.find(Submission.competition_id == comp_id).distinct("user_id")
    comp.participant_count = len(unique)
    await comp.save()

    await Activity(user_id=current_user.id, action="submitted", resource_type="competition", resource_id=comp_id).insert()
    return sub


@router.get("/{comp_id}/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(comp_id: uuid.UUID):
    comp = await Competition.get(comp_id)
    if not comp:
        raise HTTPException(404, "Competition not found")

    # Get all submissions grouped by user (best score per user)
    subs = await Submission.find(Submission.competition_id == comp_id, Submission.status == "scored").to_list()

    # Aggregate: best score per user
    user_best = {}
    user_count = {}
    user_last = {}
    for s in subs:
        uid = s.user_id
        user_count[uid] = user_count.get(uid, 0) + 1
        user_last[uid] = max(user_last.get(uid, s.created_at), s.created_at)
        if uid not in user_best:
            user_best[uid] = s.score
        else:
            if comp.higher_is_better:
                user_best[uid] = max(user_best[uid], s.score)
            else:
                user_best[uid] = min(user_best[uid], s.score)

    # Sort
    sorted_users = sorted(user_best.items(), key=lambda x: x[1], reverse=comp.higher_is_better)

    # Fetch user info
    user_ids = [uid for uid, _ in sorted_users]
    users = await User.find({"_id": {"$in": user_ids}}).to_list()
    user_map = {u.id: u for u in users}

    result = []
    for rank, (uid, score) in enumerate(sorted_users, 1):
        u = user_map.get(uid)
        result.append(LeaderboardEntry(
            rank=rank, user_id=uid,
            username=u.username if u else None,
            avatar_url=u.avatar_url if u else None,
            score=score,
            submissions=user_count.get(uid, 0),
            last_submission=user_last.get(uid, datetime.utcnow()),
        ))
    return result


@router.patch("/{comp_id}", response_model=CompetitionOut)
async def update_competition(comp_id: uuid.UUID, current_user: User = Depends(get_verified_user)):
    _require_admin(current_user)
    comp = await Competition.get(comp_id)
    if not comp:
        raise HTTPException(404, "Competition not found")
    comp.is_active = not comp.is_active
    await comp.save()
    return comp
