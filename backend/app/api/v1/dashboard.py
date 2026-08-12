from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.database import get_db
from app.models import Session, Pattern
from app.api.v1.schemas import DashboardStats

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