"""Badge definitions and auto-award logic for the achievement system."""
import uuid
from datetime import datetime, timezone
import structlog

from app.models.models import (
    UserBadge, User, Dataset, MLModel, Notebook,
    TrainingJob, Star, Discussion, Comment,
)

log = structlog.get_logger()


# ─── Badge Catalog ──────────────────────────────────────────────────────────

BADGE_CATALOG = [
    {
        "type": "first_dataset",
        "name": "Data Pioneer",
        "icon": "📊",
        "tier": "bronze",
        "description": "Uploaded your first dataset to the platform.",
        "check": "datasets",
        "threshold": 1,
    },
    {
        "type": "5_datasets",
        "name": "Data Explorer",
        "icon": "🔍",
        "tier": "silver",
        "description": "Uploaded 5 datasets — you're building a data portfolio!",
        "check": "datasets",
        "threshold": 5,
    },
    {
        "type": "25_datasets",
        "name": "Data Curator",
        "icon": "🗃️",
        "tier": "gold",
        "description": "Uploaded 25 datasets — a true data professional.",
        "check": "datasets",
        "threshold": 25,
    },
    {
        "type": "first_model",
        "name": "First Model",
        "icon": "🤖",
        "tier": "bronze",
        "description": "Trained your first ML model on the platform.",
        "check": "models",
        "threshold": 1,
    },
    {
        "type": "10_models",
        "name": "Model Master",
        "icon": "🏆",
        "tier": "gold",
        "description": "Trained 10 models — mastering the art of ML.",
        "check": "models",
        "threshold": 10,
    },
    {
        "type": "first_notebook",
        "name": "Notebook Creator",
        "icon": "📓",
        "tier": "bronze",
        "description": "Created your first cloud notebook.",
        "check": "notebooks",
        "threshold": 1,
    },
    {
        "type": "10_notebooks",
        "name": "Notebook Ninja",
        "icon": "🥷",
        "tier": "silver",
        "description": "Created 10 notebooks — productive and creative!",
        "check": "notebooks",
        "threshold": 10,
    },
    {
        "type": "gpu_pioneer",
        "name": "GPU Pioneer",
        "icon": "⚡",
        "tier": "silver",
        "description": "Ran your first GPU-accelerated training job.",
        "check": "gpu_jobs",
        "threshold": 1,
    },
    {
        "type": "community_star_10",
        "name": "Rising Star",
        "icon": "⭐",
        "tier": "silver",
        "description": "Received 10 stars on your public work.",
        "check": "stars_received",
        "threshold": 10,
    },
    {
        "type": "community_star_50",
        "name": "Community Star",
        "icon": "🌟",
        "tier": "gold",
        "description": "Received 50 stars — the community loves your work!",
        "check": "stars_received",
        "threshold": 50,
    },
    {
        "type": "discussion_helper_5",
        "name": "Helpful Voice",
        "icon": "💬",
        "tier": "bronze",
        "description": "Answered 5 community discussions.",
        "check": "comments",
        "threshold": 5,
    },
    {
        "type": "discussion_helper_20",
        "name": "Helping Hand",
        "icon": "🤝",
        "tier": "silver",
        "description": "Answered 20 community discussions — a true helper!",
        "check": "comments",
        "threshold": 20,
    },
    {
        "type": "5_training_jobs",
        "name": "Training Enthusiast",
        "icon": "🎯",
        "tier": "bronze",
        "description": "Ran 5 training jobs on the platform.",
        "check": "training_jobs",
        "threshold": 5,
    },
    {
        "type": "50_training_jobs",
        "name": "Training Champion",
        "icon": "🏅",
        "tier": "gold",
        "description": "Ran 50 training jobs — pushing the boundaries of ML.",
        "check": "training_jobs",
        "threshold": 50,
    },
    {
        "type": "pro_subscriber",
        "name": "Pro Member",
        "icon": "💎",
        "tier": "silver",
        "description": "Upgraded to Pro plan — serious about ML.",
        "check": "manual",  # Awarded on subscription upgrade
        "threshold": 0,
    },
    {
        "type": "enterprise_member",
        "name": "Enterprise Champion",
        "icon": "🏛️",
        "tier": "platinum",
        "description": "Part of an Enterprise team on Parametrix AI.",
        "check": "manual",  # Awarded on enterprise subscription
        "threshold": 0,
    },
]


async def check_and_award_badges(user_id: uuid.UUID, trigger: str = "all"):
    """
    Check if user qualifies for any new badges and award them.
    
    trigger: which type of action triggered the check, or "all" to check everything.
    """
    try:
        # Get existing badges for this user
        existing = await UserBadge.find(UserBadge.user_id == user_id).to_list()
        existing_types = {b.badge_type for b in existing}

        for badge_def in BADGE_CATALOG:
            badge_type = badge_def["type"]
            
            # Skip if already earned or manual-only
            if badge_type in existing_types or badge_def["check"] == "manual":
                continue
            
            # Skip if trigger doesn't match (optimization)
            if trigger != "all" and badge_def["check"] != trigger:
                continue

            # Check qualification
            qualified = False
            check = badge_def["check"]
            threshold = badge_def["threshold"]

            if check == "datasets":
                count = await Dataset.find(Dataset.owner_id == user_id).count()
                qualified = count >= threshold
            elif check == "models":
                count = await MLModel.find(MLModel.owner_id == user_id).count()
                qualified = count >= threshold
            elif check == "notebooks":
                count = await Notebook.find(Notebook.owner_id == user_id).count()
                qualified = count >= threshold
            elif check == "training_jobs":
                count = await TrainingJob.find(TrainingJob.owner_id == user_id).count()
                qualified = count >= threshold
            elif check == "gpu_jobs":
                count = await TrainingJob.find(
                    TrainingJob.owner_id == user_id,
                    TrainingJob.gpu_enabled == True,
                ).count()
                qualified = count >= threshold
            elif check == "stars_received":
                # Count stars on user's datasets + models + notebooks
                datasets = await Dataset.find(Dataset.owner_id == user_id).to_list()
                models = await MLModel.find(MLModel.owner_id == user_id).to_list()
                total_stars = sum(d.star_count for d in datasets) + sum(m.star_count for m in models)
                qualified = total_stars >= threshold
            elif check == "comments":
                count = await Comment.find(Comment.author_id == user_id).count()
                qualified = count >= threshold

            if qualified:
                new_badge = UserBadge(
                    user_id=user_id,
                    badge_type=badge_type,
                    badge_name=badge_def["name"],
                    badge_icon=badge_def["icon"],
                    badge_tier=badge_def["tier"],
                    description=badge_def["description"],
                    is_public=True,
                )
                await new_badge.insert()
                log.info("badge.awarded", user_id=str(user_id), badge=badge_type)

    except Exception as e:
        log.error("badge.check_failed", user_id=str(user_id), error=str(e))


async def award_manual_badge(user_id: uuid.UUID, badge_type: str):
    """Award a specific badge that is manually triggered (e.g. pro_subscriber)."""
    existing = await UserBadge.find_one(
        UserBadge.user_id == user_id,
        UserBadge.badge_type == badge_type,
    )
    if existing:
        return  # Already has this badge

    badge_def = next((b for b in BADGE_CATALOG if b["type"] == badge_type), None)
    if not badge_def:
        return

    new_badge = UserBadge(
        user_id=user_id,
        badge_type=badge_type,
        badge_name=badge_def["name"],
        badge_icon=badge_def["icon"],
        badge_tier=badge_def["tier"],
        description=badge_def["description"],
        is_public=True,
    )
    await new_badge.insert()
    log.info("badge.manual_awarded", user_id=str(user_id), badge=badge_type)


async def get_user_badges(user_id: uuid.UUID, include_private: bool = False):
    """Get badges for a user, optionally filtering out private ones."""
    query = UserBadge.find(UserBadge.user_id == user_id)
    if not include_private:
        query = UserBadge.find(UserBadge.user_id == user_id, UserBadge.is_public == True)
    
    badges = await query.sort(-UserBadge.earned_at).to_list()
    return badges


def get_badge_catalog():
    """Return the full badge catalog for display."""
    return [
        {
            "type": b["type"],
            "name": b["name"],
            "icon": b["icon"],
            "tier": b["tier"],
            "description": b["description"],
        }
        for b in BADGE_CATALOG
        if b["check"] != "manual"
    ]
