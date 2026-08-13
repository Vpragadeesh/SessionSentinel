from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.database import get_db
from app.models import Session, Pattern
from app.api.v1.schemas import DashboardStats, GuardrailStats

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    total_sessions = await db.scalar(select(func.count(Session.id)))
    total_patterns = await db.scalar(select(func.count(Pattern.id)))
    
    # High risk = HIGH or CRITICAL severity
    high_risk_count = await db.scalar(
        select(func.count(Pattern.id)).where(
            Pattern.severity.in_(["HIGH", "CRITICAL"])
        )
    )
    
    return DashboardStats(
        total_sessions=total_sessions or 0,
        total_patterns=total_patterns or 0,
        high_risk_count=high_risk_count or 0
    )


@router.get("/guardrails", response_model=GuardrailStats)
async def get_guardrail_stats(db: AsyncSession = Depends(get_db)):
    from app.models import Event, Alert
    
    total_events = await db.scalar(select(func.count(Event.id)))
    allow_count = await db.scalar(select(func.count(Event.id)).where(Event.guardrail_outcome == "ALLOW"))
    warn_count = await db.scalar(select(func.count(Event.id)).where(Event.guardrail_outcome == "WARN"))
    block_count = await db.scalar(select(func.count(Event.id)).where(Event.guardrail_outcome == "BLOCK"))
    
    # We will approximate the distribution of blocks by looking at the alerts generated.
    # A true system would map Event -> Session -> Alert, but for the dashboard we can 
    # just aggregate the blocked_events count from the evidence of Alerts.
    alerts_result = await db.execute(select(Alert))
    alerts = alerts_result.scalars().all()
    
    distribution = {}
    for alert in alerts:
        tech = alert.technique
        evidence = alert.evidence or {}
        blocked = evidence.get("blocked_events", 0)
        if blocked > 0:
            distribution[tech] = distribution.get(tech, 0) + blocked
            
    # If there are blocked events without alerts, bucket them into 'Uncategorized'
    sum_dist = sum(distribution.values())
    if block_count and sum_dist < block_count:
        distribution['Uncategorized'] = block_count - sum_dist

    return GuardrailStats(
        total_events=total_events or 0,
        allow_count=allow_count or 0,
        warn_count=warn_count or 0,
        block_count=block_count or 0,
        block_distribution=distribution
    )