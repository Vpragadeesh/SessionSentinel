import uuid
from datetime import datetime, timezone

def generate_attack_sessions(count: int = 50):
    sessions = []
    for i in range(count):
        session_id = f"atk_sess_{uuid.uuid4().hex[:8]}"
        agent_id = f"atk_agent_{i % 5}"
        
        events = []
        for j in range(3):
            # We explicitly add guardrail_outcome and guardrail_rule for the attack simulation!
            events.append({
                "id": f"evt_{uuid.uuid4().hex[:8]}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "type": "tool_call",
                "tool": "get_customer_email" if j < 2 else "get_password_reset_link",
                "action": "execute",
                "resource": "{}",
                "status": "success",
                "guardrail_outcome": "WARN" if j < 2 else "BLOCK",
                "guardrail_rule": "sensitive_data_access"
            })
            
        sessions.append({
            "id": session_id,
            "agent_id": agent_id,
            "agent_name": f"Malicious Agent {agent_id}",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "ended_at": datetime.now(timezone.utc).isoformat(),
            "events": events
        })
    return sessions

def generate_normal_sessions(count: int = 25):
    sessions = []
    for i in range(count):
        session_id = f"nml_sess_{uuid.uuid4().hex[:8]}"
        agent_id = f"nml_agent_{i % 10}"
        
        events = []
        for j in range(2):
            events.append({
                "id": f"evt_{uuid.uuid4().hex[:8]}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "type": "tool_call",
                "tool": "search_customer",
                "action": "execute",
                "resource": "{}",
                "status": "success",
                "guardrail_outcome": "ALLOW",
                "guardrail_rule": "default_allow"
            })
            
        sessions.append({
            "id": session_id,
            "agent_id": agent_id,
            "agent_name": f"Benign Agent {agent_id}",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "ended_at": datetime.now(timezone.utc).isoformat(),
            "events": events
        })
    return sessions
