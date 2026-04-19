"""Organizations routes — /api/v1/orgs/"""
import uuid
import re
import secrets
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta

from app.models.models import (
    User, Organization, OrgMembership, OrgInvite,
    SubscriptionTier,
)
from app.api.v1.auth import get_current_user
from app.services.quota_service import get_user_tier

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
    allowed_email_domains: List[str] = []
    whitelabel_config: Optional[dict] = None
    created_at: datetime

class MemberOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    username: Optional[str]
    full_name: Optional[str]
    avatar_url: Optional[str]
    role: str
    created_at: datetime

class InviteOut(BaseModel):
    id: uuid.UUID
    email: str
    role: str
    token: str
    accepted: bool
    created_at: datetime
    expires_at: datetime

class InviteRequest(BaseModel):
    email: str
    role: str = "member"

class EmailDomainsUpdate(BaseModel):
    allowed_email_domains: List[str]

class WhitelabelUpdate(BaseModel):
    brand_name: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    accent_color: Optional[str] = None
    welcome_message: Optional[str] = None
    custom_domain: Optional[str] = None


@router.post("", response_model=OrgOut, status_code=201)
async def create_org(body: OrgCreate, current_user: User = Depends(get_current_user)):
    # Lockdown: Only Enterprise users can create Organizations
    from app.services.quota_service import get_user_tier
    from app.models.models import SubscriptionTier
    tier = await get_user_tier(current_user.id)
    if tier != SubscriptionTier.enterprise and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Organization creation is restricted to Enterprise tier subscribers.")

    slug = re.sub(r"[^a-z0-9]+", "-", body.name.lower()).strip("-")
    existing = await Organization.find_one(Organization.slug == slug)
    if existing:
        raise HTTPException(409, "Organization slug already taken")

    org = Organization(name=body.name, slug=slug, description=body.description, owner_id=current_user.id)
    await org.insert()
    await OrgMembership(org_id=org.id, user_id=current_user.id, role="owner").insert()
    return org


@router.get("", response_model=List[OrgOut])
async def list_my_orgs(current_user: User = Depends(get_current_user)):
    from app.models.models import UserRole
    if current_user.role == UserRole.admin:
        return await Organization.find().to_list()
        
    memberships = await OrgMembership.find(OrgMembership.user_id == current_user.id).to_list()
    org_ids = [m.org_id for m in memberships]
    if not org_ids:
        return []
    return await Organization.find({"_id": {"$in": org_ids}}).to_list()


@router.get("/{slug}", response_model=OrgOut)
async def get_org(slug: str):
    org = await Organization.find_one(Organization.slug == slug)
    if not org:
        raise HTTPException(404, "Organization not found")
    return org


@router.delete("/{slug}", status_code=204)
async def delete_org(slug: str, current_user: User = Depends(get_current_user)):
    org = await Organization.find_one(Organization.slug == slug)
    if not org:
        raise HTTPException(404, "Organization not found")

    # Only owners or superadmins can delete
    if current_user.role.value != "admin":
        membership = await OrgMembership.find_one(
            OrgMembership.org_id == org.id, OrgMembership.user_id == current_user.id
        )
        if not membership or membership.role != "owner":
            raise HTTPException(403, "Only the organization owner can delete the organization")

    # Delete all members and invites
    await OrgMembership.find(OrgMembership.org_id == org.id).delete()
    await OrgInvite.find(OrgInvite.org_id == org.id).delete()
    
    # Finally delete the org itself
    await org.delete()


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


# ─── Email Domain Constraints (Enterprise) ──────────────────────────────────

@router.put("/{slug}/email-domains")
async def update_email_domains(
    slug: str,
    body: EmailDomainsUpdate,
    current_user: User = Depends(get_current_user),
):
    """Set allowed email domains for the organization (Enterprise only)."""
    org = await Organization.find_one(Organization.slug == slug)
    if not org:
        raise HTTPException(404, "Organization not found")

    if current_user.role.value != "admin":
        membership = await OrgMembership.find_one(
            OrgMembership.org_id == org.id, OrgMembership.user_id == current_user.id
        )
        if not membership or membership.role not in ("owner", "admin"):
            raise HTTPException(403, "Only owners/admins can update email domains")

    # Validate tier — only enterprise orgs can set email constraints
    tier = await get_user_tier(current_user.id)
    if tier not in (SubscriptionTier.enterprise, SubscriptionTier.payg):
        raise HTTPException(403, "Email domain restrictions are available on Enterprise and Pay-As-You-Go plans")

    # Validate domains
    cleaned = []
    for domain in body.allowed_email_domains:
        d = domain.strip().lower()
        if d and re.match(r'^[a-z0-9.-]+\.[a-z]{2,}$', d):
            cleaned.append(d)
        elif d:
            raise HTTPException(400, f"Invalid domain format: {d}")

    org.allowed_email_domains = cleaned
    org.updated_at = datetime.now(timezone.utc)
    await org.save()
    return {"message": "Email domains updated", "allowed_email_domains": cleaned}


# ─── Invite System ──────────────────────────────────────────────────────────

def _validate_email_domain(email: str, allowed_domains: List[str]) -> bool:
    """Check if email matches one of the allowed domains."""
    if not allowed_domains:
        return True  # No restrictions
    domain = email.split("@")[-1].lower()
    return domain in allowed_domains


@router.post("/{slug}/invite", response_model=InviteOut)
async def invite_member(
    slug: str,
    body: InviteRequest,
    current_user: User = Depends(get_current_user),
):
    """Send an invitation to join the organization."""
    org = await Organization.find_one(Organization.slug == slug)
    if not org:
        raise HTTPException(404, "Organization not found")

    if current_user.role.value != "admin":
        membership = await OrgMembership.find_one(
            OrgMembership.org_id == org.id, OrgMembership.user_id == current_user.id
        )
        if not membership or membership.role not in ("owner", "admin"):
            raise HTTPException(403, "Only owners/admins can invite members")

    # Validate email domain
    if not _validate_email_domain(body.email, org.allowed_email_domains):
        allowed = ", ".join(org.allowed_email_domains)
        raise HTTPException(
            400,
            f"Email domain not allowed. This organization only accepts emails from: {allowed}"
        )

    # Check for existing invite
    existing = await OrgInvite.find_one(
        OrgInvite.org_id == org.id,
        OrgInvite.email == body.email.lower(),
        OrgInvite.accepted == False,
    )
    if existing:
        raise HTTPException(409, "An invite has already been sent to this email")

    # Check if user is already a member
    target_user = await User.find_one(User.email == body.email.lower())
    if target_user:
        existing_membership = await OrgMembership.find_one(
            OrgMembership.org_id == org.id, OrgMembership.user_id == target_user.id
        )
        if existing_membership:
            raise HTTPException(409, "User is already a member of this organization")

    invite = OrgInvite(
        org_id=org.id,
        email=body.email.lower(),
        role=body.role,
        invited_by=current_user.id,
        token=secrets.token_urlsafe(32),
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    await invite.insert()

    # TODO: Send invitation email via email_service
    from app.core.config import settings
    import resend
    
    if settings.RESEND_API_KEY:
        resend.api_key = settings.RESEND_API_KEY
        invite_link = f"{settings.FRONTEND_URL}/join/{invite.token}"
        try:
            resend.Emails.send({
                "from": settings.EMAIL_FROM,
                "to": body.email.lower(),
                "subject": f"You've been invited to join {org.name} on Parametrix AI",
                "html": f"""
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2>Join {org.name}</h2>
                    <p>You have been invited to join the <strong>{org.name}</strong> organization on Parametrix AI.</p>
                    <p>Click the link below to accept the invitation and access the platform's enterprise features.</p>
                    <a href="{invite_link}" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">Accept Invitation</a>
                    <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser: <br/> {invite_link}</p>
                </div>
                """
            })
        except Exception as e:
            # We don't want to crash the invite process just because email failed
            # usually you would log this properly
            print(f"Failed to send invite email: {e}")

    return invite


@router.get("/{slug}/invites", response_model=List[InviteOut])
async def list_invites(
    slug: str,
    current_user: User = Depends(get_current_user),
):
    """List pending invites for an organization."""
    org = await Organization.find_one(Organization.slug == slug)
    if not org:
        raise HTTPException(404, "Organization not found")

    if current_user.role.value != "admin":
        membership = await OrgMembership.find_one(
            OrgMembership.org_id == org.id, OrgMembership.user_id == current_user.id
        )
        if not membership or membership.role not in ("owner", "admin"):
            raise HTTPException(403, "Only owners/admins can view invites")

    invites = await OrgInvite.find(
        OrgInvite.org_id == org.id,
        OrgInvite.accepted == False,
    ).sort(-OrgInvite.created_at).to_list()
    return invites


@router.delete("/{slug}/invites/{invite_id}", status_code=204)
async def revoke_invite(
    slug: str,
    invite_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
):
    """Revoke a pending invite."""
    org = await Organization.find_one(Organization.slug == slug)
    if not org:
        raise HTTPException(404, "Organization not found")

    if current_user.role.value != "admin":
        membership = await OrgMembership.find_one(
            OrgMembership.org_id == org.id, OrgMembership.user_id == current_user.id
        )
        if not membership or membership.role not in ("owner", "admin"):
            raise HTTPException(403, "Only owners/admins can revoke invites")

    invite = await OrgInvite.get(invite_id)
    if not invite or invite.org_id != org.id:
        raise HTTPException(404, "Invite not found")

    await invite.delete()


@router.post("/join/{invite_token}")
async def accept_invite(
    invite_token: str,
    current_user: User = Depends(get_current_user),
):
    """Accept an organization invitation."""
    invite = await OrgInvite.find_one(OrgInvite.token == invite_token)
    if not invite:
        raise HTTPException(404, "Invalid or expired invite link")

    if invite.accepted:
        raise HTTPException(400, "This invite has already been used")

    if invite.expires_at < datetime.now(timezone.utc):
        raise HTTPException(400, "This invite has expired")

    org = await Organization.get(invite.org_id)
    if not org:
        raise HTTPException(404, "Organization not found")

    # Validate email domain
    if not _validate_email_domain(current_user.email, org.allowed_email_domains):
        allowed = ", ".join(org.allowed_email_domains)
        raise HTTPException(
            403,
            f"Your email domain is not allowed. This organization requires: {allowed}"
        )

    # Check if already a member
    existing = await OrgMembership.find_one(
        OrgMembership.org_id == org.id, OrgMembership.user_id == current_user.id
    )
    if existing:
        raise HTTPException(409, "You are already a member")

    # Create membership
    await OrgMembership(
        org_id=org.id, user_id=current_user.id, role=invite.role
    ).insert()

    # Mark invite as accepted
    invite.accepted = True
    await invite.save()

    # Auto-upgrade user to enterprise tier to match org benefits
    from app.services.quota_service import get_or_create_subscription
    from app.models.models import SubscriptionTier, SubscriptionStatus
    sub = await get_or_create_subscription(current_user.id)
    sub.tier = SubscriptionTier.enterprise
    sub.status = SubscriptionStatus.active
    await sub.save()

    return {"message": f"Welcome to {org.name}! Your account has been upgraded to Enterprise.", "org_slug": org.slug}


@router.post("/{slug}/members")
async def add_member(slug: str, user_id: uuid.UUID, current_user: User = Depends(get_current_user)):
    org = await Organization.find_one(Organization.slug == slug)
    if not org:
        raise HTTPException(404, "Organization not found")

    if current_user.role.value != "admin":
        membership = await OrgMembership.find_one(OrgMembership.org_id == org.id, OrgMembership.user_id == current_user.id)
        if not membership or membership.role not in ("owner", "admin"):
            raise HTTPException(403, "Only owners/admins can add members")

    # Validate email domain if constraints set
    target_user = await User.get(user_id)
    if target_user and org.allowed_email_domains:
        if not _validate_email_domain(target_user.email, org.allowed_email_domains):
            allowed = ", ".join(org.allowed_email_domains)
            raise HTTPException(400, f"User's email domain not allowed. Required: {allowed}")

    existing = await OrgMembership.find_one(OrgMembership.org_id == org.id, OrgMembership.user_id == user_id)
    if existing:
        raise HTTPException(409, "User is already a member")

    await OrgMembership(org_id=org.id, user_id=user_id, role="member").insert()
    
    # Auto-upgrade to enterprise
    from app.services.quota_service import get_or_create_subscription
    from app.models.models import SubscriptionTier, SubscriptionStatus
    sub = await get_or_create_subscription(user_id)
    sub.tier = SubscriptionTier.enterprise
    sub.status = SubscriptionStatus.active
    await sub.save()

    return {"message": "Member added and upgraded to Enterprise"}


@router.delete("/{slug}/members/{user_id}", status_code=204)
async def remove_member(slug: str, user_id: uuid.UUID, current_user: User = Depends(get_current_user)):
    org = await Organization.find_one(Organization.slug == slug)
    if not org:
        raise HTTPException(404, "Organization not found")

    if current_user.role.value != "admin":
        my_membership = await OrgMembership.find_one(OrgMembership.org_id == org.id, OrgMembership.user_id == current_user.id)
        if not my_membership or my_membership.role not in ("owner", "admin"):
            raise HTTPException(403, "Only owners/admins can remove members")

    target = await OrgMembership.find_one(OrgMembership.org_id == org.id, OrgMembership.user_id == user_id)
    if not target:
        raise HTTPException(404, "Member not found")
    if target.role == "owner":
        raise HTTPException(400, "Cannot remove the owner")

    await target.delete()


# ─── White-labeling (Enterprise) ────────────────────────────────────────────

@router.get("/{slug}/whitelabel")
async def get_whitelabel(slug: str):
    """Get white-label config for org (used by frontend for theming)."""
    org = await Organization.find_one(Organization.slug == slug)
    if not org:
        raise HTTPException(404, "Organization not found")
    return org.whitelabel_config or {}


@router.put("/{slug}/whitelabel")
async def update_whitelabel(
    slug: str,
    body: WhitelabelUpdate,
    current_user: User = Depends(get_current_user),
):
    """Update white-label configuration (Enterprise only)."""
    org = await Organization.find_one(Organization.slug == slug)
    if not org:
        raise HTTPException(404, "Organization not found")

    if current_user.role.value != "admin":
        membership = await OrgMembership.find_one(
            OrgMembership.org_id == org.id, OrgMembership.user_id == current_user.id
        )
        if not membership or membership.role not in ("owner", "admin"):
            raise HTTPException(403, "Only owners/admins can update branding")

    tier = await get_user_tier(current_user.id)
    if tier != SubscriptionTier.enterprise:
        raise HTTPException(403, "White-labeling is available on the Enterprise plan only")

    config = org.whitelabel_config or {}
    if body.brand_name is not None:
        config["brand_name"] = body.brand_name
    if body.logo_url is not None:
        config["logo_url"] = body.logo_url
    if body.primary_color is not None:
        config["primary_color"] = body.primary_color
    if body.accent_color is not None:
        config["accent_color"] = body.accent_color
    if body.welcome_message is not None:
        config["welcome_message"] = body.welcome_message
    if body.custom_domain is not None:
        config["custom_domain"] = body.custom_domain

    org.whitelabel_config = config
    org.updated_at = datetime.now(timezone.utc)
    await org.save()
    return {"message": "Branding updated", "whitelabel_config": config}
