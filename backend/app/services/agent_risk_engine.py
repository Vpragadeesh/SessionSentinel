import math
from datetime import datetime, timezone
from app.models import Agent
from sqlalchemy.ext.asyncio import AsyncSession

def calculate_base_risk(detectors_results: list) -> float:
    scores = {
        "Boundary Probing": 0.0,
        "Privilege Escalation": 0.0,
        "Systematic Enumeration": 0.0
    }
    
    for r in detectors_results:
        scores[r.technique] = r.score
        
    risk = (0.35 * scores["Boundary Probing"]) + \
           (0.25 * scores["Privilege Escalation"]) + \
           (0.25 * scores["Systematic Enumeration"])
           
    active_techniques = sum(1 for s in scores.values() if s > 0)
    multiplier = 1.0 + (0.2 * (active_techniques - 1)) if active_techniques > 1 else 1.0
    
    return min(risk * multiplier, 1.0)


async def update_agent_risk(
    db: AsyncSession, 
    agent: Agent, 
    detectors_results: list
) -> float:
    now = datetime.now(timezone.utc)
    
    base_risk = calculate_base_risk(detectors_results)
    
    decayed_risk = 0.0
    if agent.last_risk_update_at and agent.current_risk_score:
        last_update = agent.last_risk_update_at
        if last_update.tzinfo is None:
            last_update = last_update.replace(tzinfo=timezone.utc)
            
        elapsed_hours = (now - last_update).total_seconds() / 3600.0
        
        if elapsed_hours >= (7 * 24):
            decayed_risk = 0.0
        else:
            decayed_risk = agent.current_risk_score * math.exp(-0.05 * elapsed_hours)
            
    new_risk = max(decayed_risk, base_risk)
    
    agent.current_risk_score = new_risk
    agent.last_risk_update_at = now
    
    await db.commit()
    return new_risk
