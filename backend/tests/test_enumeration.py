import pytest
from app.services.detectors.enumeration import detect
from app.services.detectors.common import ActorHistory
from app.models import Session, Event

def test_enumeration_detects_sequential_access():
    sessions = []
    
    for i in range(15):
        session = Session(id=f"sess_{i}")
        session.events = [
            Event(id=f"evt_{i}", resource=f"customer_{100 + i}")
        ]
        sessions.append(session)
        
    history = ActorHistory(agent_id="test_actor", sessions=sessions)
    result = detect(history)
    
    assert result is not None
    assert result.technique == "Systematic Enumeration"
    assert result.evidence["unique_targets_enumerated"] == 15
    assert result.evidence["sequentiality_score"] > 0.8

def test_enumeration_ignores_random_access():
    sessions = []
    
    import random
    random.seed(42)
    
    for i in range(15):
        session = Session(id=f"sess_{i}")
        session.events = [
            Event(id=f"evt_{i}", resource=f"customer_{random.randint(1000, 9000)}")
        ]
        sessions.append(session)
        
    history = ActorHistory(agent_id="test_actor", sessions=sessions)
    result = detect(history)
    
    assert result is None
