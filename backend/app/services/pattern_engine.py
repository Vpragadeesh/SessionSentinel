from app.models import Pattern, Session, Agent
from app.services.detectors import run_all_detectors
from app.services.detectors.common import ActorHistory
from typing import List, Dict, Any

async def run_agent_detectors(agents: List[Agent]) -> Dict[str, List[Any]]:
    """
    Run behavioral detectors for every agent's history.
    Returns a dict mapping agent_id -> list of DetectionResults
    """
    all_results = {}
    
    for agent in agents:
        # Construct history
        history = ActorHistory(
            agent_id=agent.id,
            sessions=agent.sessions
        )
        
        results = run_all_detectors(history)
        if results:
            all_results[agent.id] = results
            
    return all_results