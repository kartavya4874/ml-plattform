"""Badges & Achievements routes — /api/v1/badges/"""
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime

from app.models.models import User, UserBadge
from app.api.v1.auth import get_current_user
from app.services.badges_service import (
    get_user_badges, check_and_award_badges, get_badge_catalog,
)

router = APIRouter(prefix="/badges", tags=["Badges & Achievements"])


class BadgeOut(BaseModel):
    id: uuid.UUID
    badge_type: str
    badge_name: str
    badge_icon: str
    badge_tier: str
    description: str
    is_public: bool
    earned_at: datetime


class BadgeCatalogItem(BaseModel):
    type: str
    name: str
    icon: str
    tier: str
    description: str


@router.get("/me", response_model=List[BadgeOut])
async def get_my_badges(current_user: User = Depends(get_current_user)):
    """Get all badges for the authenticated user (including private)."""
    badges = await get_user_badges(current_user.id, include_private=True)
    return badges


@router.get("/catalog", response_model=List[BadgeCatalogItem])
async def get_all_badges():
    """Get the full badge catalog (what badges can be earned)."""
    return get_badge_catalog()


@router.get("/user/{user_id}", response_model=List[BadgeOut])
async def get_public_badges(user_id: uuid.UUID):
    """Get public badges for any user."""
    user = await User.get(user_id)
    if not user:
        raise HTTPException(404, "User not found")
    
    # Respect user's master toggle
    if not user.badges_public:
        return []  # User has hidden all badges
    
    badges = await get_user_badges(user_id, include_private=False)
    return badges


@router.put("/{badge_id}/visibility")
async def toggle_badge_visibility(
    badge_id: uuid.UUID,
    is_public: bool,
    current_user: User = Depends(get_current_user),
):
    """Toggle visibility of a specific badge."""
    badge = await UserBadge.get(badge_id)
    if not badge or badge.user_id != current_user.id:
        raise HTTPException(404, "Badge not found")
    
    badge.is_public = is_public
    await badge.save()
    return {"message": "Badge visibility updated", "is_public": is_public}


@router.put("/settings")
async def update_badge_settings(
    badges_public: bool,
    current_user: User = Depends(get_current_user),
):
    """Toggle master badge visibility for public profile."""
    current_user.badges_public = badges_public
    await current_user.save()
    return {"message": "Badge settings updated", "badges_public": badges_public}


@router.post("/check")
async def trigger_badge_check(current_user: User = Depends(get_current_user)):
    """Manually trigger a badge check for the current user."""
    await check_and_award_badges(current_user.id, trigger="all")
    badges = await get_user_badges(current_user.id, include_private=True)
    return {"checked": True, "total_badges": len(badges)}
