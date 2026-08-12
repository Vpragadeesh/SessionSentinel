from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.models import Agent, Session, Alert
from app.api.v1.schemas import ActorCreate, ActorResponse, SessionResponse, AlertResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from app.config import settings

class ActorRiskResponse(BaseModel):
    id: str
    name: str
    type: str
    current_risk_score: float
    last_risk_update_at: Optional[datetime]
    first_seen_at: datetime
    last_seen_at: datetime
    status: str


router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("", response_model=ActorResponse, status_code=status.HTTP_201_CREATED)
async def create_actor(agent: ActorCreate, db: AsyncSession = Depends(get_db)):
    db_actor = Agent(**agent.model_dump())
    db.add(db_actor)
    await db.commit()
    await db.refresh(db_actor)
    return db_actor


@router.get("", response_model=list[ActorResponse])
async def list_actors(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Agent).offset(skip).limit(limit).order_by(Agent.created_at.desc())
    )
    return result.scalars().all()


@router.get("/top-risk", response_model=list[ActorRiskResponse])
async def list_top_risk_actors(
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Agent)
        .where(Agent.current_risk_score > 0)
        .order_by(Agent.current_risk_score.desc())
        .limit(limit)
    )
    agents = result.scalars().all()
    
    now = datetime.now(timezone.utc)
    reset_td = timedelta(hours=settings.agent_inactivity_reset_hours)
    
    active_risky_actors = []
    for agent in agents:
        if agent.last_risk_update_at:
            last_update = agent.last_risk_update_at
            if last_update.tzinfo is None:
                last_update = last_update.replace(tzinfo=timezone.utc)
            
            if now - last_update > reset_td:
                continue
        
        active_risky_actors.append(agent)
        
    return active_risky_actors


@router.get("/{agent_id}", response_model=ActorResponse)
async def get_actor(agent_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.get("/{agent_id}/sessions", response_model=list[SessionResponse])
async def get_actor_sessions(agent_id: str, skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Session)
        .where(Session.agent_id == agent_id)
        .order_by(Session.started_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/{agent_id}/alerts", response_model=list[AlertResponse])
async def get_actor_alerts(agent_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Alert)
        .where(Alert.agent_id == agent_id)
        .order_by(Alert.created_at.desc())
    )
    return result.scalars().all()
