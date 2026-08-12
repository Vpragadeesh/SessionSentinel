from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Agent, Session, Event
from datetime import datetime, timezone
import uuid

async def record_event(
    db: AsyncSession,
    agent_id: str,
    session_id: str,
    event_type: str,
    *,
    tool: str = None,
    action: str = None,
    resource: str = None,
    status: str = "success",
    guardrail_outcome: str = None,
    guardrail_rule: str = None,
    input_hash: str = None,
    metadata_json: dict = None,
):
    """
    Centralized event ingestion.
    Creates or updates the agent and session if they don't exist.
    """
    now = datetime.now(timezone.utc)
    
    # 1. Upsert Agent
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        agent = Agent(
            id=agent_id,
            name=f"Agent-{agent_id[-4:]}",
            type="anonymous",
            first_seen_at=now,
            last_seen_at=now
        )
        db.add(agent)
    else:
        agent.last_seen_at = now
        
    # 2. Upsert Session
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        session = Session(
            id=session_id,
            agent_id=agent_id,
            started_at=now,
            event_count=0
        )
        db.add(session)
        
    session.ended_at = now
    session.event_count += 1
    
    # 3. Create Event
    event = Event(
        id=f"evt_{uuid.uuid4().hex[:8]}",
        session_id=session_id,
        timestamp=now,
        type=event_type,
        tool=tool,
        action=action,
        resource=resource,
        status=status,
        guardrail_outcome=guardrail_outcome,
        guardrail_rule=guardrail_rule,
        input_hash=input_hash,
        metadata_json=metadata_json
    )
    db.add(event)
    
    await db.commit()
    return event
