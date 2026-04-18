"""Quota enforcement service — checks and tracks resource usage per tier."""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import HTTPException

from app.models.models import (
    Subscription, UsageRecord, SubscriptionTier, SubscriptionStatus, User
)


# ── Tier Limits Configuration ─────────────────────────────────────────────────

TIER_LIMITS = {
    SubscriptionTier.free: {
        "datasets": 10,
        "max_file_size_bytes": 100 * 1024 * 1024,       # 100 MB
        "training_jobs_per_month": 20,
        "models": 10,
        "deployments": 3,
        "inference_requests_per_month": 5_000,
        "api_keys_per_model": 2,
    },
    SubscriptionTier.pro: {
        "datasets": 25,
        "max_file_size_bytes": 2 * 1024 * 1024 * 1024,  # 2 GB
        "training_jobs_per_month": 50,
        "models": 20,
        "deployments": 10,
        "inference_requests_per_month": 50_000,
        "api_keys_per_model": 5,
    },
    SubscriptionTier.enterprise: {
        "datasets": 999_999,
        "max_file_size_bytes": 50 * 1024 * 1024 * 1024,  # 50 GB
        "training_jobs_per_month": 999_999,
        "models": 999_999,
        "deployments": 999_999,
        "inference_requests_per_month": 999_999,
        "api_keys_per_model": 999_999,
    },
}

PRICING_INFO = [
    {
        "tier": "free",
        "name": "Free",
        "price_monthly": 0,
        "price_label": "₹0",
        "description": "Perfect for exploring the platform and building your first models.",
        "limits": {
            "datasets": 3,
            "max_file_size_mb": 100,
            "training_jobs_per_month": 5,
            "models": 3,
            "deployments": 1,
            "inference_requests_per_month": 1_000,
            "api_keys_per_model": 1,
        },
        "features": [
            "3 datasets (up to 100 MB each)",
            "5 training jobs per month",
            "3 models",
            "1 deployment",
            "1,000 inference requests/month",
            "Community support",
            "Data profiling & quality reports",
        ],
        "is_popular": False,
    },
    {
        "tier": "pro",
        "name": "Pro",
        "price_monthly": 2499,
        "price_label": "₹2,499/mo",
        "description": "For professionals and teams building production ML pipelines.",
        "limits": {
            "datasets": 25,
            "max_file_size_mb": 2048,
            "training_jobs_per_month": 50,
            "models": 20,
            "deployments": 10,
            "inference_requests_per_month": 50_000,
            "api_keys_per_model": 5,
        },
        "features": [
            "25 datasets (up to 2 GB each)",
            "50 training jobs per month",
            "20 models",
            "10 deployments",
            "50,000 inference requests/month",
            "Priority support",
            "SHAP & explainability lab",
            "Batch inference",
            "Model export (ONNX / Docker)",
        ],
        "is_popular": True,
    },
    {
        "tier": "enterprise",
        "name": "Enterprise",
        "price_monthly": 7999,
        "price_label": "₹7,999/mo",
        "description": "Unlimited scale for large teams and enterprise deployments.",
        "limits": {
            "datasets": 999_999,
            "max_file_size_mb": 51200,
            "training_jobs_per_month": 999_999,
            "models": 999_999,
            "deployments": 999_999,
            "inference_requests_per_month": 999_999,
            "api_keys_per_model": 999_999,
        },
        "features": [
            "Unlimited datasets (up to 50 GB each)",
            "Unlimited training jobs",
            "Unlimited models",
            "Unlimited deployments",
            "Unlimited inference requests",
            "Dedicated support & SLA",
            "SSO & team management",
            "Custom model hosting",
            "Audit logs & compliance",
        ],
        "is_popular": False,
    },
]


def _current_period_bounds() -> tuple[datetime, datetime]:
    """Return (start, end) of the current billing month (1st–1st)."""
    now = datetime.now(timezone.utc)
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    # Next month 1st
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)
    return start, end


async def get_or_create_subscription(user_id: uuid.UUID) -> Subscription:
    """Get the user's subscription, creating a free one if none exists."""
    sub = await Subscription.find_one(Subscription.user_id == user_id)
    if not sub:
        period_start, period_end = _current_period_bounds()
        sub = Subscription(
            user_id=user_id,
            tier=SubscriptionTier.free,
            status=SubscriptionStatus.active,
            current_period_start=period_start,
            current_period_end=period_end,
        )
        await sub.insert()
    return sub


async def get_or_create_usage(user_id: uuid.UUID) -> UsageRecord:
    """Get/create the current month's usage record for a user."""
    period_start, period_end = _current_period_bounds()
    usage = await UsageRecord.find_one(
        UsageRecord.user_id == user_id,
        UsageRecord.period_start == period_start,
    )
    if not usage:
        usage = UsageRecord(
            user_id=user_id,
            period_start=period_start,
            period_end=period_end,
        )
        await usage.insert()
    return usage


def get_tier_limits(tier: SubscriptionTier) -> dict:
    """Return the limits dict for a given tier."""
    return TIER_LIMITS.get(tier, TIER_LIMITS[SubscriptionTier.free])


async def get_user_tier(user_id: uuid.UUID) -> SubscriptionTier:
    """Get the user's active subscription tier."""
    sub = await get_or_create_subscription(user_id)
    if sub.status not in (SubscriptionStatus.active, SubscriptionStatus.trialing):
        return SubscriptionTier.free
    return sub.tier


RESOURCE_TO_USAGE_FIELD = {
    "datasets": "datasets_created",
    "training_jobs": "training_jobs_run",
    "models": "models_created",
    "deployments": "deployments_active",
    "inference_requests": "inference_requests",
}

RESOURCE_TO_LIMIT_KEY = {
    "datasets": "datasets",
    "training_jobs": "training_jobs_per_month",
    "models": "models",
    "deployments": "deployments",
    "inference_requests": "inference_requests_per_month",
}


async def check_quota(user_id: uuid.UUID, resource_type: str, amount: int = 1):
    """
    Raise 402 Payment Required if the user has exceeded their tier limit
    for the given resource_type.
    """
    tier = await get_user_tier(user_id)
    limits = get_tier_limits(tier)
    limit_key = RESOURCE_TO_LIMIT_KEY.get(resource_type)
    if not limit_key:
        return  # Unknown resource type — no enforcement

    max_allowed = limits[limit_key]
    usage = await get_or_create_usage(user_id)
    usage_field = RESOURCE_TO_USAGE_FIELD.get(resource_type, resource_type)
    current = getattr(usage, usage_field, 0)

    if current + amount > max_allowed:
        tier_name = tier.value.capitalize()
        raise HTTPException(
            status_code=402,
            detail={
                "error": "Quota exceeded",
                "resource": resource_type,
                "current": current,
                "limit": max_allowed,
                "tier": tier.value,
                "message": f"You've reached your {tier_name} plan limit of {max_allowed} {resource_type.replace('_', ' ')}. "
                           f"Upgrade your plan to continue.",
            },
        )


async def increment_usage(user_id: uuid.UUID, resource_type: str, amount: int = 1):
    """Atomically increment a usage counter for the current billing period."""
    usage = await get_or_create_usage(user_id)
    usage_field = RESOURCE_TO_USAGE_FIELD.get(resource_type, resource_type)
    current = getattr(usage, usage_field, 0)
    setattr(usage, usage_field, current + amount)
    usage.updated_at = datetime.now(timezone.utc)
    await usage.save()


async def get_usage_summary(user_id: uuid.UUID) -> dict:
    """Return current usage vs limits for the user."""
    tier = await get_user_tier(user_id)
    limits = get_tier_limits(tier)
    usage = await get_or_create_usage(user_id)
    return {
        "tier": tier.value,
        "usage": {
            "datasets_created": usage.datasets_created,
            "training_jobs_run": usage.training_jobs_run,
            "models_created": usage.models_created,
            "deployments_active": usage.deployments_active,
            "inference_requests": usage.inference_requests,
            "storage_bytes_used": usage.storage_bytes_used,
        },
        "limits": {
            "datasets": limits["datasets"],
            "max_file_size_mb": limits["max_file_size_bytes"] // (1024 * 1024),
            "training_jobs_per_month": limits["training_jobs_per_month"],
            "models": limits["models"],
            "deployments": limits["deployments"],
            "inference_requests_per_month": limits["inference_requests_per_month"],
            "api_keys_per_model": limits["api_keys_per_model"],
        },
    }
