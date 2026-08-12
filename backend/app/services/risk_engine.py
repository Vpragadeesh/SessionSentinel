from typing import Dict, Any


def compute_risk_score(pattern_stats: Dict[str, Any]) -> float:
    frequency_score = min(pattern_stats.get("size", 0) / 30, 1.0)
    similarity_score = pattern_stats.get("avg_similarity", 0.0)
    
    sensitive_keywords = {"email", "phone", "address", "token", "key", "password", "ssn", "credential", "auth"}
    common_actions = pattern_stats.get("common_actions", [])
    sensitive_hits = sum(1 for action in common_actions if any(k in action.lower() for k in sensitive_keywords))
    sensitive_score = min(sensitive_hits / 2, 1.0)
    
    tool_diversity = len(pattern_stats.get("common_tools", []))
    tool_score = min(tool_diversity / 5, 1.0)
    
    score = (
        frequency_score * 0.30 +
        similarity_score * 0.25 +
        sensitive_score * 0.25 +
        tool_score * 0.20
    )
    
    return round(score, 2)


def score_to_level(score: float) -> str:
    if score >= 0.80:
        return "CRITICAL"
    elif score >= 0.60:
        return "HIGH"
    elif score >= 0.30:
        return "MEDIUM"
    else:
        return "LOW"