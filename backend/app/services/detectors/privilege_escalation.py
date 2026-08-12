from .common import DetectionResult, AgentHistory

CAPABILITY_LEVELS = {
    "search_customer": 1,
    "get_customer": 2,
    "get_email": 3,
    "get_phone": 4,
    "get_address": 5,
    "get_ssn": 6,
    "update_customer": 7,
    "delete_customer": 8,
}

def detect(history: AgentHistory) -> DetectionResult:
    sessions = history.sessions
    if len(sessions) < 3:
        return None
        
    session_max_caps = []
    
    for session in sessions:
        max_cap = 0
        for event in session.events:
            action = event.action or ""
            cap = CAPABILITY_LEVELS.get(action, 0)
            if cap > max_cap:
                max_cap = cap
        session_max_caps.append(max_cap)
        
    progression_score = 0.0
    increases = 0
    max_level_reached = 0
    
    for i in range(1, len(session_max_caps)):
        if session_max_caps[i] > session_max_caps[i-1] and session_max_caps[i-1] > 0:
            increases += 1
        max_level_reached = max(max_level_reached, session_max_caps[i])
        
    max_level_reached = max(max_level_reached, session_max_caps[0] if session_max_caps else 0)
    
    if increases == 0 or max_level_reached < 3: 
        return None
        
    progression_score = min(increases / 3.0, 1.0)
    sensitivity_score = min(max_level_reached / 8.0, 1.0)
    repetition = min(len(sessions) / 10.0, 1.0)
    
    score = (0.50 * progression_score) + (0.30 * sensitivity_score) + (0.20 * repetition)
    
    if score < 0.4:
        return None
        
    return DetectionResult(
        technique="Privilege Escalation",
        score=round(score, 2),
        confidence=round(progression_score, 2),
        evidence={
            "sessions": len(sessions),
            "max_level_reached": max_level_reached,
            "escalation_steps": increases
        }
    )
