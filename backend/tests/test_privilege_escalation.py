import pytest
from app.services.detectors.privilege_escalation import detect
from app.services.detectors.common import ActorHistory
from app.models import Session, Event

def test_privilege_escalation_detects_escalation():
    sessions = []
    
    actions = ["search_customer", "get_phone", "get_ssn", "update_customer"]
    
    for i, action in enumerate(actions):
        session = Session(id=f"sess_{i}")
        session.events = [
            Event(id=f"evt_{i}", action=action)
        ]
        sessions.append(session)
        
    history = ActorHistory(agent_id="test_actor", sessions=sessions)
    result = detect(history)
    
    assert result is not None
    assert result.technique == "Privilege Escalation"
    assert result.evidence["escalation_steps"] == 3
    assert result.evidence["max_level_reached"] == 7

def test_privilege_escalation_ignores_random_actions():
    sessions = []
    
    actions = ["search_customer", "get_customer", "search_customer"]
    
    for i, action in enumerate(actions):
        session = Session(id=f"sess_{i}")
        session.events = [
            Event(id=f"evt_{i}", action=action)
        ]
        sessions.append(session)
        
    history = ActorHistory(agent_id="test_actor", sessions=sessions)
    result = detect(history)
    
    assert result is None
