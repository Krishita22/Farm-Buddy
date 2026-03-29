"""Farm Buddy — No fake data. Only real user data from signups and conversations."""
import asyncio
from database import init_db

async def seed():
    await init_db()
    print("Database initialized. No fake data — only real users.")

if __name__ == "__main__":
    asyncio.run(seed())
