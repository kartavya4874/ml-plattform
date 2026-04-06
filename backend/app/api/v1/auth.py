"""Authentication routes — /api/v1/auth/"""
import uuid
import time
import logging
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slugify import slugify

from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token
)
from app.models.models import User
from app.schemas.schemas import (
    UserRegister, UserLogin, TokenResponse, RefreshRequest, UserOut
)
from app.services.email_service import send_verification_email
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])
bearer_scheme = HTTPBearer()


async def get_redis():
    """Yield a Redis client, or None if Redis is unavailable."""
    try:
        r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        await r.ping()  # verify connectivity
        try:
            yield r
        finally:
            await r.aclose()
    except Exception:
        logger.warning("Redis is unavailable — token revocation features are disabled.")
        yield None


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
async def register(
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
async def login(body: UserLogin):
    """Authenticate and return access + refresh tokens."""
    user = await User.find_one(User.email == body.email)
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
