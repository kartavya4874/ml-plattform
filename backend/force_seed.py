import asyncio
from app.core.database import init_db, seed_admins_from_env
from app.core.config import settings
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    print("Initializing DB...")
    await init_db()
    print("Done")

if __name__ == '__main__':
    asyncio.run(main())
