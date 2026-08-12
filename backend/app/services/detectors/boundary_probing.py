from .common import DetectionResult, ActorHistory
from app.services.clustering import compute_cluster_stats

def detect(history: ActorHistory) -> DetectionResult:
    sessions = history.sessions
    
    if len(sessions) < 5:
        return None
        
    blocked_count = 0
    total_events = 0
    for session in sessions:
        has_blocked = False
        for event in session.events:
            total_events += 1
            if event.guardrail_outcome == "BLOCK":
                has_blocked = True
        if has_blocked:
            blocked_count += 1
            
    if blocked_count < 3:
        return None
        
    stats = compute_cluster_stats(sessions)
    similarity = stats.get("avg_similarity", 0.0)
    
    if similarity < 0.75:
        return None
        
    blocked_ratio = blocked_count / len(sessions)
    repetition = min(len(sessions) / 20.0, 1.0)
    
    score = (0.45 * similarity) + (0.35 * blocked_ratio) + (0.20 * repetition)
    
    return DetectionResult(
        technique="Boundary Probing",
        score=round(score, 2),
        confidence=round(similarity, 2),
        evidence={
            "sessions": len(sessions),
            "blocked": blocked_count,
            "similarity": round(similarity, 2)
        }
    )
