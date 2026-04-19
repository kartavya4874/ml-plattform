"""Discussion Forum routes - /api/v1/discussions"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from pydantic import BaseModel, Field
import uuid
from datetime import datetime
from app.api.v1.auth import get_current_user, get_verified_user
from app.models.models import User, Discussion, Comment, Vote

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
    title: str = Field(..., max_length=255)
    content: str = Field(..., max_length=50000)
    resource_type: Optional[str] = None
    resource_id: Optional[uuid.UUID] = None

class CommentCreate(BaseModel):
    content: str = Field(..., max_length=10000)
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

@router.post("", response_model=DiscussionOut, status_code=201)
async def create_discussion(body: DiscussionCreate, current_user: User = Depends(get_verified_user)):
    discussion = Discussion(
        author_id=current_user.id,
        title=body.title,
        content=body.content,
        resource_type=body.resource_type,
        resource_id=body.resource_id,
    )
    await discussion.insert()
    return {**discussion.dict(), "comment_count": 0}

@router.get("", response_model=List[DiscussionOut])
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
async def get_discussion(id: uuid.UUID, current_user: User = Depends(get_current_user)):
    d = await Discussion.get(id)
    if not d: raise HTTPException(status_code=404, detail="Discussion not found")
    count = await Comment.find(Comment.discussion_id == d.id).count()
    # Check if current user has voted
    voted = await Vote.find_one(
        Vote.user_id == current_user.id,
        Vote.resource_type == "discussion",
        Vote.resource_id == d.id,
    )
    return {**d.dict(), "comment_count": count, "user_voted": voted is not None}

@router.post("/{discussion_id}/comments", response_model=CommentOut)
async def add_comment(discussion_id: uuid.UUID, body: CommentCreate, current_user: User = Depends(get_verified_user)):
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
async def get_comments(discussion_id: uuid.UUID, current_user: User = Depends(get_current_user)):
    """Return comments as a threaded tree with user_voted flags."""
    all_comments = await Comment.find(Comment.discussion_id == discussion_id).sort(+Comment.created_at).to_list()
    
    # Get all of this user's votes on comments in this discussion
    comment_ids = [c.id for c in all_comments]
    user_votes = await Vote.find(
        Vote.user_id == current_user.id,
        Vote.resource_type == "comment",
        {"resource_id": {"$in": comment_ids}},
    ).to_list()
    voted_ids = {v.resource_id for v in user_votes}
    
    # Build tree
    by_id = {}
    roots = []
    for c in all_comments:
        node = {**c.dict(), "replies": [], "user_voted": c.id in voted_ids}
        by_id[c.id] = node
        if c.parent_id and c.parent_id in by_id:
            by_id[c.parent_id]["replies"].append(node)
        else:
            roots.append(node)
    return roots

@router.post("/{id}/upvote")
async def upvote_discussion(id: uuid.UUID, current_user: User = Depends(get_verified_user)):
    """Toggle upvote on a discussion. Returns new count and voted status."""
    d = await Discussion.get(id)
    if not d: raise HTTPException(status_code=404, detail="Discussion not found")
    
    existing = await Vote.find_one(
        Vote.user_id == current_user.id,
        Vote.resource_type == "discussion",
        Vote.resource_id == id,
    )
    
    if existing:
        # Already voted — remove the vote (toggle off)
        await existing.delete()
        d.upvotes = max(0, d.upvotes - 1)
        await d.save()
        return {"upvotes": d.upvotes, "user_voted": False}
    else:
        # New vote
        vote = Vote(user_id=current_user.id, resource_type="discussion", resource_id=id)
        await vote.insert()
        d.upvotes += 1
        await d.save()
        return {"upvotes": d.upvotes, "user_voted": True}

@router.post("/comments/{id}/upvote")
async def upvote_comment(id: uuid.UUID, current_user: User = Depends(get_verified_user)):
    """Toggle upvote on a comment. Returns new count and voted status."""
    c = await Comment.get(id)
    if not c: raise HTTPException(status_code=404, detail="Comment not found")
    
    existing = await Vote.find_one(
        Vote.user_id == current_user.id,
        Vote.resource_type == "comment",
        Vote.resource_id == id,
    )
    
    if existing:
        await existing.delete()
        c.upvotes = max(0, c.upvotes - 1)
        await c.save()
        return {"upvotes": c.upvotes, "user_voted": False}
    else:
        vote = Vote(user_id=current_user.id, resource_type="comment", resource_id=id)
        await vote.insert()
        c.upvotes += 1
        await c.save()
        return {"upvotes": c.upvotes, "user_voted": True}
