"""Organizations routes — /api/v1/orgs/"""
import uuid
import re
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime

from app.models.models import User, Organization, OrgMembership
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/orgs", tags=["Organizations"])


class OrgCreate(BaseModel):
    name: str
    description: Optional[str] = None

class OrgOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: Optional[str]
    avatar_url: Optional[str]
    owner_id: uuid.UUID
    is_public: bool
    created_at: datetime

class MemberOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    username: Optional[str]
    full_name: Optional[str]
    avatar_url: Optional[str]
    role: str
    created_at: datetime


@router.post("/", response_model=OrgOut, status_code=201)
async def create_org(body: OrgCreate, current_user: User = Depends(get_current_user)):
    slug = re.sub(r"[^a-z0-9]+", "-", body.name.lower()).strip("-")
    existing = await Organization.find_one(Organization.slug == slug)
    if existing:
        raise HTTPException(409, "Organization slug already taken")

    org = Organization(name=body.name, slug=slug, description=body.description, owner_id=current_user.id)
    await org.insert()
    await OrgMembership(org_id=org.id, user_id=current_user.id, role="owner").insert()
    return org


@router.get("/", response_model=List[OrgOut])
async def list_my_orgs(current_user: User = Depends(get_current_user)):
    memberships = await OrgMembership.find(OrgMembership.user_id == current_user.id).to_list()
    org_ids = [m.org_id for m in memberships]
    return await Organization.find({"_id": {"$in": org_ids}}).to_list()


@router.get("/{slug}", response_model=OrgOut)
async def get_org(slug: str):
    org = await Organization.find_one(Organization.slug == slug)
    if not org:
        raise HTTPException(404, "Organization not found")
    return org


@router.get("/{slug}/members", response_model=List[MemberOut])
async def get_org_members(slug: str):
    org = await Organization.find_one(Organization.slug == slug)
    if not org:
        raise HTTPException(404, "Organization not found")

    members = await OrgMembership.find(OrgMembership.org_id == org.id).to_list()
    user_ids = [m.user_id for m in members]
    users = await User.find({"_id": {"$in": user_ids}}).to_list()
    user_map = {u.id: u for u in users}

    result = []
    for m in members:
        u = user_map.get(m.user_id)
        result.append(MemberOut(
            id=m.id, user_id=m.user_id,
            username=u.username if u else None,
            full_name=u.full_name if u else None,
            avatar_url=u.avatar_url if u else None,
            role=m.role, created_at=m.created_at,
        ))
    return result


@router.post("/{slug}/members")
async def add_member(slug: str, user_id: uuid.UUID, current_user: User = Depends(get_current_user)):
    org = await Organization.find_one(Organization.slug == slug)
    if not org:
        raise HTTPException(404, "Organization not found")

    membership = await OrgMembership.find_one(OrgMembership.org_id == org.id, OrgMembership.user_id == current_user.id)
    if not membership or membership.role not in ("owner", "admin"):
        raise HTTPException(403, "Only owners/admins can add members")

    existing = await OrgMembership.find_one(OrgMembership.org_id == org.id, OrgMembership.user_id == user_id)
    if existing:
        raise HTTPException(409, "User is already a member")

    await OrgMembership(org_id=org.id, user_id=user_id, role="member").insert()
    return {"message": "Member added"}


@router.delete("/{slug}/members/{user_id}", status_code=204)
async def remove_member(slug: str, user_id: uuid.UUID, current_user: User = Depends(get_current_user)):
    org = await Organization.find_one(Organization.slug == slug)
    if not org:
        raise HTTPException(404, "Organization not found")

    my_membership = await OrgMembership.find_one(OrgMembership.org_id == org.id, OrgMembership.user_id == current_user.id)
    if not my_membership or my_membership.role not in ("owner", "admin"):
        raise HTTPException(403, "Only owners/admins can remove members")

    target = await OrgMembership.find_one(OrgMembership.org_id == org.id, OrgMembership.user_id == user_id)
    if not target:
        raise HTTPException(404, "Member not found")
    if target.role == "owner":
        raise HTTPException(400, "Cannot remove the owner")

    await target.delete()
