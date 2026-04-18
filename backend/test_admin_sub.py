import asyncio
from app.core.database import init_db
from app.models.models import User, Subscription
from app.api.v1.admin import admin_update_subscription
import uuid

async def main():
    await init_db()
    u = await User.find_one()
    if not u:
        print("No user.")
        return
    print("User id:", u.id)
    # mock execution
    try:
        res = await admin_update_subscription(user_id=u.id, tier="enterprise", current_user=u)
        print("API Res:", res)
    except Exception as e:
        print("API Error:", e)

    sub = await Subscription.find_one(Subscription.user_id == u.id)
    print("Result DB tier:", sub.tier if sub else "None")

if __name__ == "__main__":
    asyncio.run(main())
