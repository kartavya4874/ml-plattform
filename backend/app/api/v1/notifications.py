"""Notification routes — /api/v1/notifications/"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from datetime import datetime

from app.models.models import Notification, User
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationOut(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    type: str
    title: str
    message: str
    link: str | None
    is_read: bool
    created_at: datetime


@router.get("/", response_model=list[NotificationOut])
async def list_notifications(
    unread_only: bool = False,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
):
    """List notifications for the current user."""
    query = Notification.find(Notification.user_id == current_user.id)
    if unread_only:
        query = query.find(Notification.is_read == False)
    return await query.sort("-created_at").limit(limit).to_list()


@router.get("/count")
async def unread_count(current_user: User = Depends(get_current_user)):
    """Return the count of unread notifications."""
    count = await Notification.find(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).count()
    return {"unread": count}


@router.post("/{notification_id}/read")
async def mark_read(notification_id: uuid.UUID, current_user: User = Depends(get_current_user)):
    """Mark a single notification as read."""
    notif = await Notification.get(notification_id)
    if not notif or notif.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    await notif.save()
    return {"ok": True}


@router.post("/read-all")
async def mark_all_read(current_user: User = Depends(get_current_user)):
    """Mark all notifications as read."""
    await Notification.find(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).update({"$set": {"is_read": True}})
    return {"ok": True}


# Helper to create notifications from anywhere in the backend
async def create_notification(
    user_id: uuid.UUID,
    type: str,
    title: str,
    message: str = "",
    link: str | None = None,
):
    """Create a notification for a user."""
    notif = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        link=link,
    )
    await notif.insert()
    return notif
