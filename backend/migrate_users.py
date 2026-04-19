import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def migrate_user_roles():
    print(f"Connecting to MongoDB at {settings.MONGODB_URL}")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    users_collection = db["users"]
    
    # We want to change any "free" or "pro" roles to "user"
    # Keep "admin" as is (since those are system administrators seeded).
    # Since we dropped pro/free from UserRole enum, loading User model on those rows would crash Pydantic.
    
    result = await users_collection.update_many(
        {"role": {"$in": ["free", "pro"]}},
        {"$set": {"role": "user"}}
    )
    
    print(f"Migration Complete: Modified {result.modified_count} users successfully out of {result.matched_count} found.")


if __name__ == "__main__":
    asyncio.run(migrate_user_roles())
