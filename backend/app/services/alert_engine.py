from datetime import datetime, timezone
import uuid
from app.models import Alert, Agent
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

def get_severity_band(score: float) -> str:
    if score >= 0.80:
        return "CRITICAL"
    elif score >= 0.60:
        return "HIGH"
    elif score >= 0.30:
        return "MEDIUM"
    return "LOW"

async def process_alerts(db: AsyncSession, agent: Agent, detectors_results: list):
    now = datetime.now(timezone.utc)
    
    db_result = await db.execute(
        select(Alert)
        .where(Alert.agent_id == agent.id)
        .where(Alert.status == "open")
    )
    existing_alerts = db_result.scalars().all()
    
    for result in detectors_results:
        severity = get_severity_band(result.score)
        if severity == "LOW":
            continue
            
        should_create = True
        for alert in existing_alerts:
            if alert.technique == result.technique:
                if alert.severity == severity or (severity == "MEDIUM" and alert.severity in ["HIGH", "CRITICAL"]) or (severity == "HIGH" and alert.severity == "CRITICAL"):
                    should_create = False
                    if result.score > alert.risk_score:
                        alert.risk_score = result.score
                        alert.evidence = result.evidence
                    break
                    
        if should_create:
            new_alert = Alert(
                id=f"alert_{uuid.uuid4().hex[:8]}",
                agent_id=agent.id,
                technique=result.technique,
                severity=severity,
                risk_score=result.score,
                summary=f"Detected {result.technique} activity with {severity} severity.",
                evidence=result.evidence,
                created_at=now,
                status="open"
            )
            db.add(new_alert)
            
    await db.commit()
