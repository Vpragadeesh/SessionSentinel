import asyncio
from app.db.database import engine
from app.models import Base

async def drop():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    print("Tables dropped!")

if __name__ == "__main__":
    asyncio.run(drop())
