"""Authentication routes — /api/v1/auth/"""
import uuid
import time
import logging
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slugify import slugify

from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token
)
from app.models.models import User
from app.schemas.schemas import (
    UserRegister, UserLogin, TokenResponse, RefreshRequest, UserOut, UserUpdate, UserPasswordUpdate
)
from app.services.email_service import send_verification_email
from app.services.storage_service import StorageService
import redis.asyncio as aioredis
from app.core.config import settings
from app.core.limiter import limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])
bearer_scheme = HTTPBearer()


async def get_redis():
    """Return a Redis client, or None if Redis is unavailable."""
    try:
        r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        await r.ping()  # verify connectivity
        return r
    except Exception:
        logger.warning("Redis is unavailable — token revocation features are disabled.")
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    redis_client=Depends(get_redis),
) -> User:
    """JWT guard — validates token and returns the current user."""
    token = credentials.credentials
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")

    # Check revocation list (skip if Redis is unavailable)
    if redis_client is not None:
        try:
            revoked = await redis_client.get(f"revoked:{token}")
            if revoked:
                raise HTTPException(status_code=401, detail="Token has been revoked")
        except Exception:
            logger.warning("Redis error during revocation check — skipping.")

    user_id = payload.get("sub")
    user = await User.get(uuid.UUID(user_id))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


@router.post("/register", response_model=UserOut, status_code=201)
@limiter.limit("5/minute")
async def register(
    request: Request,
    body: UserRegister,
    background_tasks: BackgroundTasks,
):
    """Create a new user account."""
    existing = await User.find_one(User.email == body.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    base_slug = slugify(body.email.split("@")[0])
    slug = base_slug
    counter = 1
    while True:
        slug_check = await User.find_one(User.slug == slug)
        if not slug_check:
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    verification_token = uuid.uuid4().hex
    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        verification_token=verification_token,
        slug=slug,
    )
    await user.insert()
    
    background_tasks.add_task(send_verification_email, body.email, verification_token)
    return user


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, body: UserLogin):
    """Authenticate and return access + refresh tokens."""
    # Use case-insensitive search so legacy accounts with caps in the DB still match
    user = await User.find_one({"email": {"$regex": f"^{body.email}$", "$options": "i"}})
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    access_token = create_access_token(str(user.id), {"role": user.role.value})
    refresh_token = create_refresh_token(str(user.id))
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest):
    """Exchange a valid refresh token for new access + refresh tokens."""
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
        
    user_id = payload.get("sub")
    user = await User.get(uuid.UUID(user_id))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    access_token = create_access_token(str(user.id), {"role": user.role.value})
    new_refresh = create_refresh_token(str(user.id))
    return TokenResponse(access_token=access_token, refresh_token=new_refresh)


@router.post("/logout", status_code=204)
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    redis_client=Depends(get_redis),
):
    """Revoke the current access token by adding to Redis denylist."""
    token = credentials.credentials
    payload = decode_token(token)
    ttl = int(payload.get("exp", 0) - time.time())
    if ttl > 0 and redis_client is not None:
        try:
            await redis_client.setex(f"revoked:{token}", ttl, "1")
        except Exception:
            logger.warning("Redis unavailable — could not revoke token.")


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    return current_user


@router.put("/me", response_model=UserOut)
async def update_me(body: UserUpdate, current_user: User = Depends(get_current_user)):
    """Update authenticated user's profile."""
    if body.full_name is not None:
        current_user.full_name = body.full_name
    if body.email is not None and body.email != current_user.email:
        existing = await User.find_one(User.email == body.email)
        if existing:
            raise HTTPException(status_code=409, detail="Email already taken")
        current_user.email = body.email
    if body.username is not None and body.username != current_user.username:
        existing_slug = await User.find_one(User.username == body.username)
        if existing_slug:
            raise HTTPException(status_code=409, detail="Username already taken")
        current_user.username = body.username
    if body.is_public is not None:
        current_user.is_public = body.is_public
    if body.bio is not None:
        current_user.bio = body.bio
    if body.website is not None:
        current_user.website = body.website
    if body.github_url is not None:
        current_user.github_url = body.github_url
    if body.kaggle_url is not None:
        current_user.kaggle_url = body.kaggle_url
    if body.is_2fa_enabled is not None:
        current_user.is_2fa_enabled = body.is_2fa_enabled
    await current_user.save()
    return current_user


@router.delete("/me", status_code=204)
async def delete_me(
    current_user: User = Depends(get_current_user),
    redis_client=Depends(get_redis),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
):
    """Permanently delete user account and some associated data."""
    # Delete org memberships
    from app.models.models import OrgMembership
    await OrgMembership.find(OrgMembership.user_id == current_user.id).delete()
    
    # Optional: Delete datasets/models or orphan them
    # For now, we'll just physically drop the user
    await current_user.delete()
    
    # Revoke tokens
    token = credentials.credentials
    if redis_client is not None:
        try:
            await redis_client.setex(f"revoked:{token}", 86400, "1")
        except Exception:
            pass


@router.post("/me/avatar", response_model=UserOut)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    storage: StorageService = Depends(StorageService.get_instance)
):
    """Upload and set user profile picture. Automatically uses Firebase if configured, falling back to Local/MinIO."""
    allowed_mimes = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed_mimes:
        raise HTTPException(status_code=415, detail="Unsupported image format. Use JPEG, PNG, or WEBP.")
    
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(status_code=413, detail="Avatar exceeds 5MB limit")

    ext = file.filename.split(".")[-1] if file.filename else "jpg"
    object_name = f"{current_user.id}/avatar_{int(time.time())}.{ext}"
    
    await storage.upload_bytes(
        bucket="avatars", 
        object_name=object_name, 
        data=content, 
        content_type=file.content_type
    )
    
    current_user.avatar_url = f"/api/v1/data/download/avatars/{object_name}"
    await current_user.save()
    return current_user


@router.put("/me/password", status_code=200)
async def update_my_password(body: UserPasswordUpdate, current_user: User = Depends(get_current_user)):
    """Update authenticated user's password."""
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect current password")
    
    current_user.hashed_password = hash_password(body.new_password)
    await current_user.save()
    return {"message": "Password updated successfully"}


@router.get("/verify/{token}", status_code=200)
async def verify_email(token: str):
    """Verify email address from token sent in welcome email."""
    user = await User.find_one(User.verification_token == token)
    if not user:
        raise HTTPException(status_code=404, detail="Invalid verification token")
        
    user.is_verified = True
    user.verification_token = None
    await user.save()
    
    return {"message": "Email verified successfully"}
