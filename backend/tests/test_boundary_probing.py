import pytest
from app.services.detectors.boundary_probing import detect
from app.services.detectors.common import AgentHistory
from app.models import Session, Event

def test_boundary_probing_detects_probes():
    sessions = []
    for i in range(6):
        session = Session(id=f"sess_{i}")
        session.events = [
            Event(id=f"evt_{i}_1", guardrail_outcome="PASS"),
            Event(id=f"evt_{i}_2", guardrail_outcome="BLOCK" if i < 4 else "PASS")
        ]
        session.embedding = [0.1, 0.1] 
        sessions.append(session)
        
    history = AgentHistory(agent_id="test_agent", sessions=sessions)
    result = detect(history)
    
    assert result is not None
    assert result.technique == "Boundary Probing"
    assert result.evidence["blocked"] == 4
    
def test_boundary_probing_ignores_normal_traffic():
    sessions = []
    for i in range(10):
        session = Session(id=f"sess_{i}")
        session.events = [
            Event(id=f"evt_{i}_1", guardrail_outcome="PASS")
        ]
        session.embedding = [0.1, 0.1]
        sessions.append(session)
        
    history = AgentHistory(agent_id="test_agent", sessions=sessions)
    result = detect(history)
    
    assert result is None
