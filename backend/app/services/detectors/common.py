from dataclasses import dataclass
from typing import List, Dict, Any

@dataclass
class DetectionResult:
    technique: str
    score: float
    confidence: float
    evidence: Dict[str, Any]

@dataclass
class ActorHistory:
    agent_id: str
    sessions: List[Any]
