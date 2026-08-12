from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.models import Agent
from app.api.v1.schemas import AgentCreate, AgentResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AgentRiskResponse(BaseModel):
    id: str
    name: str
    type: str
    current_risk_score: float
    last_risk_update_at: Optional[datetime]

router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
async def create_agent(agent: AgentCreate, db: AsyncSession = Depends(get_db)):
    db_agent = Agent(**agent.model_dump())
    db.add(db_agent)
    await db.commit()
    await db.refresh(db_agent)
    return db_agent


@router.get("", response_model=list[AgentResponse])
async def list_agents(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Agent).offset(skip).limit(limit).order_by(Agent.created_at.desc())
    )
    return result.scalars().all()


@router.get("/top-risk", response_model=list[AgentRiskResponse])
async def list_top_risk_agents(
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns agents ordered by their current risk score (descending).
    Only returns agents with a score > 0.
    """
    result = await db.execute(
        select(Agent)
        .where(Agent.current_risk_score > 0)
        .order_by(Agent.current_risk_score.desc())
        .limit(limit)
    )
    agents = result.scalars().all()
    
    # We should also apply the decay logic here just in case they haven't been touched 
    # since the decay window passed, so the UI doesn't show stale risk.
    from app.config import settings
    from datetime import datetime, timezone, timedelta
    
    now = datetime.now(timezone.utc)
    reset_td = timedelta(hours=settings.agent_inactivity_reset_hours)
    
    active_risky_agents = []
    for agent in agents:
        if agent.last_risk_update_at:
            last_update = agent.last_risk_update_at
            if last_update.tzinfo is None:
                last_update = last_update.replace(tzinfo=timezone.utc)
            
            if now - last_update > reset_td:
                # Decayed to 0, don't include
                continue
        
        active_risky_agents.append(agent)
        
    return active_risky_agents


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent
