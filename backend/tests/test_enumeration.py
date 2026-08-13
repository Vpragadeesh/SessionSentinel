import pytest
from app.services.detectors.enumeration import detect
from app.services.detectors.common import AgentHistory
from app.models import Session, Event

def test_enumeration_detects_sequential_access():
    sessions = []
    
    for i in range(15):
        session = Session(id=f"sess_{i}")
        session.events = [
            Event(id=f"evt_{i}", resource=f"customer_{100 + i}")
        ]
        sessions.append(session)
        
    history = AgentHistory(agent_id="test_agent", sessions=sessions)
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
        
    history = AgentHistory(agent_id="test_agent", sessions=sessions)
    result = detect(history)
    
    assert result is None

def test_enumeration_detects_wildcard_resource_enumeration():
    """Positive test: Detects systematic traversal across structured wildcard resources."""
    resources = [
        "customer.*",
        "order.*",
        "product.*",
        "user.*",
        "analytics.*",
        "inventory.*",
        "payment.*"
    ]
    sessions = []
    # 4 sessions traversing the structured wildcard resources
    for s_idx in range(4):
        session = Session(id=f"sess_wildcard_{s_idx}")
        # Each session probes a subset / full set of the wildcard resources
        session.events = [
            Event(id=f"evt_{s_idx}_{r_idx}", resource=res)
            for r_idx, res in enumerate(resources[: 5 + (s_idx % 3)])
        ]
        sessions.append(session)

    history = AgentHistory(agent_id="agent_dan_r_test", sessions=sessions)
    result = detect(history)

    assert result is not None
    assert result.technique == "Systematic Enumeration"
    assert result.score >= 0.70
    assert result.confidence >= 0.70
    assert result.evidence["unique_targets_enumerated"] >= 5
    assert result.evidence["mode"] == "resource_category"
    assert "customer" in result.evidence["categories"]
    assert "order" in result.evidence["categories"]
    assert "product" in result.evidence["categories"]

def test_enumeration_ignores_ordinary_resource_access():
    """Negative test: Proves ordinary non-systematic resource access is ignored."""
    ordinary_resources = [
        ["customer.profile", "customer.email"],
        ["order.history", "order.tracking"],
        ["product.price", "product.stock"],
        ["user.settings", "user.profile"],
        ["billing.invoice", "billing.payment_method"],
    ]
    sessions = []
    for s_idx, res_list in enumerate(ordinary_resources):
        session = Session(id=f"sess_normal_{s_idx}")
        session.events = [
            Event(id=f"evt_norm_{s_idx}_{r_idx}", resource=res)
            for r_idx, res in enumerate(res_list)
        ]
        sessions.append(session)

    history = AgentHistory(agent_id="agent_normal_test", sessions=sessions)
    result = detect(history)

    assert result is None
