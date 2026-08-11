import asyncio
from sqlalchemy import text
from app.db.database import engine

async def migrate():
    async with engine.begin() as conn:
        print("Starting migrations...")
        
        # 1. Update agents table
        try:
            await conn.execute(text("ALTER TABLE agents ADD COLUMN first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL;"))
            await conn.execute(text("ALTER TABLE agents ADD COLUMN last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL;"))
            await conn.execute(text("ALTER TABLE agents ADD COLUMN status VARCHAR(20) DEFAULT 'active' NOT NULL;"))
            print("Updated agents table.")
        except Exception as e:
            print(f"Agents table update error (might already exist): {e}")

        # 2. Update events table
        try:
            await conn.execute(text("ALTER TABLE events ADD COLUMN guardrail_outcome VARCHAR(30);"))
            await conn.execute(text("ALTER TABLE events ADD COLUMN guardrail_rule VARCHAR(100);"))
            await conn.execute(text("ALTER TABLE events ADD COLUMN input_hash VARCHAR(128);"))
            await conn.execute(text("ALTER TABLE events ADD COLUMN metadata_json JSON;"))
            print("Updated events table.")
        except Exception as e:
            print(f"Events table update error (might already exist): {e}")
            
        # 3. Update patterns table
        try:
            await conn.execute(text("ALTER TABLE patterns RENAME COLUMN affected_agents TO affected_agents;"))
            print("Updated patterns table.")
        except Exception as e:
            print(f"Patterns table update error: {e}")

        # 4. Create alerts table
        try:
            await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS alerts (
                id VARCHAR PRIMARY KEY,
                agent_id VARCHAR NOT NULL REFERENCES agents(id),
                technique VARCHAR(50) NOT NULL,
                severity VARCHAR(20) NOT NULL,
                risk_score FLOAT NOT NULL,
                summary TEXT NOT NULL,
                evidence JSON,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'open'
            )
            """))
            print("Created alerts table.")
        except Exception as e:
            print(f"Alerts table creation error: {e}")
            
        print("Migrations finished successfully!")

if __name__ == "__main__":
    asyncio.run(migrate())
