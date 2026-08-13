from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.models import Technique
from pydantic import BaseModel

router = APIRouter(prefix="/techniques", tags=["techniques"])

class TechniqueResponse(BaseModel):
    id: str
    name: str
    risk_weight: float
    description: str | None = None

    class Config:
        from_attributes = True

@router.get("", response_model=list[TechniqueResponse])
async def get_techniques(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Technique).order_by(Technique.risk_weight.desc()))
    return result.scalars().all()
