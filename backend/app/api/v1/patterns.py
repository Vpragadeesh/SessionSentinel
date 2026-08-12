from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.models import Pattern
from app.api.v1.schemas import PatternResponse
from app.services.llm.service import generate_pattern_explanation, get_llm_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/patterns", tags=["patterns"])


@router.get("", response_model=list[PatternResponse])
async def list_patterns(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Pattern).offset(skip).limit(limit).order_by(Pattern.detected_at.desc())
    )
    return result.scalars().all()


@router.get("/{pattern_id}", response_model=PatternResponse)
async def get_pattern(pattern_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Pattern).where(Pattern.id == pattern_id))
    pattern = result.scalar_one_or_none()
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")
    return pattern


@router.post("/{pattern_id}/explain")
async def explain_pattern(pattern_id: str, db: AsyncSession = Depends(get_db)):
    """
    (Re)generate an LLM explanation for a specific pattern.
    Tries NVIDIA NIM first, falls back to Groq, then auto-explanation.
    """
    result = await db.execute(select(Pattern).where(Pattern.id == pattern_id))
    pattern = result.scalar_one_or_none()
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")

    pattern_data = {
        "pattern": pattern.name,
        "affected_sessions": pattern.affected_sessions,
        "similarity": float(pattern.confidence) if pattern.confidence else 0.0,
        "tools": pattern.common_tools or [],
        "resources": pattern.common_actions or [],
        "risk": pattern.severity,
    }

    service = get_llm_service()
    explanation, provider = await service.explain(pattern_data)

    # Persist the explanation
    pattern.llm_explanation = explanation
    await db.commit()

    return {
        "pattern_id": pattern_id,
        "pattern_name": pattern.name,
        "provider": provider,
        "explanation": explanation,
    }


@router.get("/llm/status")
async def llm_status():
    """Check which LLM providers are available."""
    service = get_llm_service()
    return {
        "providers_available": [name for name, _ in service.providers],
        "primary": service.providers[0][0] if service.providers else None,
        "fallback": service.providers[1][0] if len(service.providers) > 1 else None,
    }