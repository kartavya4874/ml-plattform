"""Database engine and configuration for MongoDB using Beanie."""
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings

# Global motor client
client: AsyncIOMotorClient | None = None

async def init_db():
    """Initialize MongoDB connection and Beanie ODM."""
    from app.models.models import (
        User, Dataset, TrainingJob, MLModel, 
        Deployment, APIKey, InferenceLog, AuditLog,
        Subscription, UsageRecord, Invoice,
        Discussion, Comment,
        Star, Follow, Fork, Activity,
        Notebook,
        Competition, Submission,
        Organization, OrgMembership,
        Notification,
    )
    import structlog
    import asyncio
    
    log = structlog.get_logger()
    global client
    
    # Try connecting to actual MongoDB first
    client = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=2000)
    
    try:
        # Force a call to test the connection (2 second timeout)
        await client.admin.command('ping')
        log.info("database.connected", url=settings.MONGODB_URL)
        database = client[settings.MONGODB_DB_NAME]
    except Exception as exc:
        log.warning(
            "database.unavailable",
            error=str(exc),
            hint="Falling back to in-memory mongomock_motor database for local testing."
        )
        # Fallback to in-memory mock if no local db is running
        from mongomock_motor import AsyncMongoMockClient
        client = AsyncMongoMockClient()
        database = client[settings.MONGODB_DB_NAME]
    
    await init_beanie(
        database=database,
        document_models=[
            User, Dataset, TrainingJob, MLModel,
            Deployment, APIKey, InferenceLog, AuditLog,
            Subscription, UsageRecord, Invoice,
            Discussion, Comment,
            Star, Follow, Fork, Activity,
            Notebook,
            Competition, Submission,
            Organization, OrgMembership,
            Notification,
        ],
        allow_index_dropping=False
    )
    
    await seed_admins_from_env()

async def seed_admins_from_env():
    """Seed initial admin users from environment variable ADMIN_USERS_SEED."""
    import structlog
    from app.models.models import User, UserRole
    from app.core.security import hash_password
    
    if not settings.ADMIN_USERS_SEED:
        return
        
    log = structlog.get_logger()
    pairs = settings.ADMIN_USERS_SEED.split(",")
    for pair in pairs:
        pair = pair.strip()
        if not pair or ":" not in pair:
            continue
        try:
            email, password = pair.split(":", 1)
            email = email.lower().strip()
            password = password.strip()
            
            if not email or not password:
                continue
                
            existing = await User.find_one(User.email == email)
            if not existing:
                admin_user = User(
                    email=email,
                    hashed_password=hash_password(password),
                    full_name="System Admin",
                    role=UserRole.admin,
                    is_active=True,
                    is_verified=True,
                    slug=email.split("@")[0]
                )
                await admin_user.insert()
                log.info("admin.seeded", email=email)
        except Exception as e:
            log.error("admin.seed.failed", error=str(e), pair=pair)

async def close_db():
    """Close MongoDB connection."""
    global client
    if client and not hasattr(client, "_collection_class"): # Don't close mock client
        client.close()
