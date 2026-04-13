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
    model_config = {"from_attributes": True}
    id: uuid.UUID
    discussion_id: uuid.UUID
    author_id: uuid.UUID
    author_name: str
    parent_id: uuid.UUID | None = None
    content: str
    upvotes: int
    created_at: datetime
    replies: list["CommentOut"] = []
    
class DiscussionCreate(BaseModel):
    title: str
    content: str
    resource_type: Optional[str] = None
    resource_id: Optional[uuid.UUID] = None

class CommentCreate(BaseModel):
    content: str
    parent_id: Optional[uuid.UUID] = None

class DiscussionOut(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    author_id: uuid.UUID
    title: str
    content: str
    resource_type: Optional[str]
    resource_id: Optional[uuid.UUID]
    upvotes: int
    comment_count: int = 0
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
    return {**discussion.dict(), "comment_count": 0}

@router.get("/", response_model=List[DiscussionOut])
async def list_discussions(resource_type: Optional[str] = None, resource_id: Optional[uuid.UUID] = None):
    query = {}
    if resource_type: query["resource_type"] = resource_type
    if resource_id: query["resource_id"] = resource_id
    if query:
        discussions = await Discussion.find(query).sort(-Discussion.created_at).to_list()
    else:
        discussions = await Discussion.find().sort(-Discussion.created_at).to_list()
    
    # Enrich with comment counts
    result = []
    for d in discussions:
        count = await Comment.find(Comment.discussion_id == d.id).count()
        result.append({**d.dict(), "comment_count": count})
    return result

@router.get("/{id}")
async def get_discussion(id: uuid.UUID):
    d = await Discussion.get(id)
    if not d: raise HTTPException(status_code=404, detail="Discussion not found")
    count = await Comment.find(Comment.discussion_id == d.id).count()
    return {**d.dict(), "comment_count": count}

@router.post("/{discussion_id}/comments", response_model=CommentOut)
async def add_comment(discussion_id: uuid.UUID, body: CommentCreate, current_user: User = Depends(get_current_user)):
    d = await Discussion.get(discussion_id)
    if not d: raise HTTPException(status_code=404, detail="Discussion not found")
    
    # If replying, validate parent exists
    if body.parent_id:
        parent = await Comment.get(body.parent_id)
        if not parent or parent.discussion_id != discussion_id:
            raise HTTPException(status_code=404, detail="Parent comment not found")
    
    c = Comment(
        discussion_id=discussion_id,
        author_id=current_user.id,
        author_name=current_user.full_name or current_user.email.split("@")[0],
        parent_id=body.parent_id,
        content=body.content,
    )
    await c.insert()
    return {**c.dict(), "replies": []}

@router.get("/{discussion_id}/comments")
async def get_comments(discussion_id: uuid.UUID):
    """Return comments as a threaded tree."""
    all_comments = await Comment.find(Comment.discussion_id == discussion_id).sort(+Comment.created_at).to_list()
    
    # Build tree
    by_id = {}
    roots = []
    for c in all_comments:
        node = {**c.dict(), "replies": []}
        by_id[c.id] = node
        if c.parent_id and c.parent_id in by_id:
            by_id[c.parent_id]["replies"].append(node)
        else:
            roots.append(node)
    return roots

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
