from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Any, Dict
from uuid import UUID


class AgentBase(BaseModel):
    name: str
    type: str


class AgentCreate(AgentBase):
    pass


class AgentResponse(AgentBase):
    id: str
    created_at: datetime
    first_seen_at: datetime
    last_seen_at: datetime
    status: str
    current_risk_score: float
    last_risk_update_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SessionBase(BaseModel):
    agent_id: str


class SessionCreate(SessionBase):
    started_at: datetime
    ended_at: Optional[datetime] = None


class SessionUpdate(BaseModel):
    ended_at: Optional[datetime] = None
    event_count: Optional[int] = None
    fingerprint: Optional[str] = None
    embedding: Optional[List[float]] = None


class SessionResponse(SessionBase):
    id: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    event_count: int
    fingerprint: Optional[str] = None
    embedding: Optional[List[float]] = None
    events: Optional[List['EventResponse']] = None

    class Config:
        from_attributes = True


class EventBase(BaseModel):
    session_id: str
    timestamp: datetime
    type: str
    tool: Optional[str] = None
    action: Optional[str] = None
    resource: Optional[str] = None
    status: str
    guardrail_outcome: Optional[str] = None
    guardrail_rule: Optional[str] = None
    input_hash: Optional[str] = None
    metadata_json: Optional[Any] = None


class EventCreate(EventBase):
    pass


class EventResponse(EventBase):
    id: str

    class Config:
        from_attributes = True


class PatternBase(BaseModel):
    name: str
    severity: str
    confidence: float
    affected_sessions: int
    affected_agents: int
    common_tools: List[str]
    common_actions: List[str]
    llm_explanation: Optional[str] = None
    risk_score: Optional[float] = None
    cluster_id: Optional[int] = None


class PatternCreate(PatternBase):
    pass


class PatternResponse(PatternBase):
    id: str
    detected_at: datetime

    class Config:
        from_attributes = True


class AlertBase(BaseModel):
    agent_id: str
    technique: str
    severity: str
    risk_score: float
    summary: str
    evidence: Optional[Any] = None
    status: str


class AlertCreate(AlertBase):
    pass


class AlertResponse(AlertBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    total_sessions: int
    total_patterns: int
    high_risk_count: int

class GuardrailStats(BaseModel):
    total_events: int
    allow_count: int
    warn_count: int
    block_count: int
    block_distribution: Dict[str, int]