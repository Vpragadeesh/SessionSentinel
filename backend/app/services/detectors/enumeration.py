from .common import DetectionResult, AgentHistory
import re

def detect(history: AgentHistory) -> DetectionResult:
    sessions = history.sessions
    if len(sessions) < 10:
        return None
        
    identifiers = []
    
    for session in sessions:
        for event in session.events:
            resource = event.resource or event.action or ""
            matches = re.findall(r'\d+', resource)
            if matches:
                identifiers.append(int(matches[-1]))
                
    if len(identifiers) < 10:
        return None
        
    identifiers.sort()
    
    sequential_count = 0
    for i in range(1, len(identifiers)):
        diff = identifiers[i] - identifiers[i-1]
        if 0 < diff <= 3:
            sequential_count += 1
            
    sequentiality = min(sequential_count / (len(identifiers) - 1), 1.0)
    
    unique_ids = len(set(identifiers))
    coverage = min(unique_ids / 50.0, 1.0)
    repetition = min(len(sessions) / 50.0, 1.0)
    regularity = 1.0 
    
    score = (0.40 * sequentiality) + (0.30 * coverage) + (0.20 * repetition) + (0.10 * regularity)
    
    if score < 0.5 or sequentiality < 0.5:
        return None
        
    return DetectionResult(
        technique="Systematic Enumeration",
        score=round(score, 2),
        confidence=round(sequentiality, 2),
        evidence={
            "sessions": len(sessions),
            "unique_targets_enumerated": unique_ids,
            "sequentiality_score": round(sequentiality, 2)
        }
    )
