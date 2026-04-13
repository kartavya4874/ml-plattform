import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    users = await db.User.find().to_list(100)
    for u in users:
        print("USER:", u.get('email'), u.get('is_active'), u.get('role'))
    client.close()

if __name__ == '__main__':
    asyncio.run(main())
