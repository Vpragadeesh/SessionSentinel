from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Dict, Any
from app.db.database import get_db
from app.models import Session, Event, Agent
from app.api.v1.schemas import SessionCreate, SessionUpdate, SessionResponse

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(session: SessionCreate, db: AsyncSession = Depends(get_db)):
    db_session = Session(**session.model_dump())
    db.add(db_session)
    await db.commit()
    await db.refresh(db_session)
    return db_session


@router.get("", response_model=list[SessionResponse])
async def list_sessions(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Session)
        .options(selectinload(Session.events))
        .offset(skip)
        .limit(limit)
        .order_by(Session.started_at.desc())
    )
    return result.scalars().all()


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Session).options(selectinload(Session.events)).where(Session.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.patch("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: str,
    session_update: SessionUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    update_data = session_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(session, field, value)

    await db.commit()
    await db.refresh(session)
    return session


@router.post("/bulk", status_code=status.HTTP_201_CREATED)
async def bulk_ingest_sessions(
    sessions_data: List[Dict[str, Any]],
    db: AsyncSession = Depends(get_db)
):
    """
    Bulk ingest sessions from the simulator.
    Each item must have: id, agent_id, actor_name, started_at, ended_at, events[]
    Creates agents if they don't already exist. Skips duplicate sessions/events.
    """
    from datetime import datetime, timezone

    sessions_created = 0
    events_created = 0
    skipped = 0

    for session_data in sessions_data:
        # Upsert agent
        # Accept either agent_id (old format) or agent_id
        agent_id = session_data.get("agent_id") or session_data.get("agent_id")
        if not agent_id:
            continue
            
        result = await db.execute(select(Agent).where(Agent.id == agent_id))
        agent = result.scalar_one_or_none()
        if not agent:
            agent = Agent(
                id=agent_id,
                name=session_data.get("actor_name", session_data.get("agent_name", f"Agent-{agent_id[-4:]}")),
                type="simulated",
            )
            db.add(agent)
        else:
            # Update last_seen
            agent.last_seen_at = datetime.now(timezone.utc)

        # Skip if session already exists
        result = await db.execute(select(Session).where(Session.id == session_data["id"]))
        if result.scalar_one_or_none():
            skipped += 1
            continue

        # Parse datetimes (handle ISO strings)
        def parse_dt(val):
            if isinstance(val, str):
                if val.endswith("Z"):
                    val = val[:-1] + "+00:00"
                return datetime.fromisoformat(val)
            return val

        session = Session(
            id=session_data["id"],
            agent_id=agent_id,
            started_at=parse_dt(session_data["started_at"]),
            ended_at=parse_dt(session_data["ended_at"]) if session_data.get("ended_at") else None,
            event_count=len(session_data.get("events", [])),
        )
        db.add(session)
        sessions_created += 1

        for evt in session_data.get("events", []):
            event = Event(
                id=evt["id"],
                session_id=session_data["id"],
                timestamp=parse_dt(evt["timestamp"]),
                type=evt.get("type", "tool_call"),
                tool=evt.get("tool"),
                action=evt.get("action"),
                resource=evt.get("resource"),
                status=evt.get("status", "success"),
                guardrail_outcome=evt.get("guardrail_outcome"),
                guardrail_rule=evt.get("guardrail_rule"),
                input_hash=evt.get("input_hash"),
                metadata_json=evt.get("metadata_json"),
            )
            db.add(event)
            events_created += 1

    await db.commit()
    return {
        "message": "Bulk ingest complete",
        "sessions_created": sessions_created,
        "events_created": events_created,
        "skipped_duplicates": skipped,
    }