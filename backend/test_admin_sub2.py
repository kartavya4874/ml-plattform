import asyncio
from app.core.database import init_db
from app.api.v1.admin import list_all_users
from app.models.models import User

async def main():
    await init_db()
    u = await User.find_one()
    # mock execution
    res = await list_all_users(u)
    for x in res:
        print(f"ID: {x.id}, Tier: {x.tier}")

if __name__ == "__main__":
    asyncio.run(main())
