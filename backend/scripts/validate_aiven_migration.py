import asyncio
import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

SOURCE_URL = os.getenv("SOURCE_DB_URL")
TARGET_URL = os.getenv("TARGET_DB_URL")

TABLES = ["agents", "sessions", "events", "patterns", "alerts", "techniques"]

async def fetch_row_count(engine, table: str) -> int:
    async with engine.connect() as conn:
        result = await conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
        return result.scalar()

async def fetch_schema(engine, table: str):
    query = """
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = :table_name
        ORDER BY column_name;
    """
    async with engine.connect() as conn:
        result = await conn.execute(text(query), {"table_name": table})
        return {row[0]: row[1] for row in result.fetchall()}

async def main():
    if not SOURCE_URL or not TARGET_URL:
        print("Error: SOURCE_DB_URL and TARGET_DB_URL environment variables must be set.")
        sys.exit(1)

    print("Connecting to SOURCE and TARGET databases...")
    source_engine = create_async_engine(SOURCE_URL)
    target_engine = create_async_engine(TARGET_URL)

    all_passed = True

    for table in TABLES:
        print(f"\n--- Validating Table: {table} ---")
        
        # Row Count Comparison
        source_count = await fetch_row_count(source_engine, table)
        target_count = await fetch_row_count(target_engine, table)
        
        print(f"Row count -> SOURCE: {source_count} | TARGET: {target_count}")
        if source_count != target_count:
            print("❌ ROW COUNT MISMATCH!")
            all_passed = False
        else:
            print("✅ Row count matches.")

        # Schema Comparison
        source_schema = await fetch_schema(source_engine, table)
        target_schema = await fetch_schema(target_engine, table)

        if source_schema != target_schema:
            print("❌ SCHEMA MISMATCH!")
            print(f"Source columns: {source_schema}")
            print(f"Target columns: {target_schema}")
            all_passed = False
        else:
            print("✅ Schema matches.")

    await source_engine.dispose()
    await target_engine.dispose()

    if all_passed:
        print("\n🎉 SUCCESS: Database validation passed! It is safe to switch the application to Aiven.")
        sys.exit(0)
    else:
        print("\n💥 FAILURE: Validation errors detected. DO NOT switch to Aiven.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
