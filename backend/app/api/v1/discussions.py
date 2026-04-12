"""Discussion Forum routes - /api/v1/discussions"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from pydantic import BaseModel
import uuid
from datetime import datetime
from app.api.v1.auth import get_current_user
from app.models.models import User, Discussion, Comment

router = APIRouter(prefix="/discussions", tags=["Discussions"])

class CommentOut(BaseModel):
    id: uuid.UUID
    author_id: uuid.UUID
    content: str
    upvotes: int
    created_at: datetime
    
class DiscussionCreate(BaseModel):
    title: str
    content: str
    resource_type: Optional[str] = None
    resource_id: Optional[uuid.UUID] = None

class CommentCreate(BaseModel):
    content: str

class DiscussionOut(BaseModel):
    id: uuid.UUID
    author_id: uuid.UUID
    title: str
    content: str
    resource_type: Optional[str]
    resource_id: Optional[uuid.UUID]
    upvotes: int
    created_at: datetime

@router.post("/", response_model=DiscussionOut, status_code=201)
async def create_discussion(body: DiscussionCreate, current_user: User = Depends(get_current_user)):
    discussion = Discussion(
        author_id=current_user.id,
        title=body.title,
        content=body.content,
        resource_type=body.resource_type,
        resource_id=body.resource_id,
    )
    await discussion.insert()
    return discussion

@router.get("/", response_model=List[DiscussionOut])
async def list_discussions(resource_type: Optional[str] = None, resource_id: Optional[uuid.UUID] = None):
    query = {}
    if resource_type: query["resource_type"] = resource_type
    if resource_id: query["resource_id"] = resource_id
    if query:
        return await Discussion.find(query).sort(-Discussion.created_at).to_list()
    return await Discussion.find().sort(-Discussion.created_at).to_list()

@router.get("/{id}", response_model=DiscussionOut)
async def get_discussion(id: uuid.UUID):
    d = await Discussion.get(id)
    if not d: raise HTTPException(status_code=404, detail="Discussion not found")
    return d

@router.post("/{discussion_id}/comments", response_model=CommentOut)
async def add_comment(discussion_id: uuid.UUID, body: CommentCreate, current_user: User = Depends(get_current_user)):
    d = await Discussion.get(discussion_id)
    if not d: raise HTTPException(status_code=404, detail="Discussion not found")
    
    c = Comment(
        discussion_id=discussion_id,
        author_id=current_user.id,
        content=body.content
    )
    await c.insert()
    return c

@router.get("/{discussion_id}/comments", response_model=List[CommentOut])
async def get_comments(discussion_id: uuid.UUID):
    return await Comment.find(Comment.discussion_id == discussion_id).sort(+Comment.created_at).to_list()

@router.post("/{id}/upvote")
async def upvote_discussion(id: uuid.UUID, current_user: User = Depends(get_current_user)):
    d = await Discussion.get(id)
    if not d: raise HTTPException(status_code=404, detail="Discussion not found")
    d.upvotes += 1
    await d.save()
    return d

@router.post("/comments/{id}/upvote")
async def upvote_comment(id: uuid.UUID, current_user: User = Depends(get_current_user)):
    c = await Comment.get(id)
    if not c: raise HTTPException(status_code=404, detail="Comment not found")
    c.upvotes += 1
    await c.save()
    return c
