from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey, JSON, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime, timezone
import uuid

Base = declarative_base()


class Agent(Base):
    __tablename__ = "agents"

    id = Column(String, primary_key=True, default=lambda: f"agent_{uuid.uuid4().hex[:8]}")
    name = Column(String(255), nullable=False)
    type = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    current_risk_score = Column(Float, default=0.0)
    last_risk_update_at = Column(DateTime(timezone=True), nullable=True)

    sessions = relationship("Session", back_populates="agent")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, default=lambda: f"sess_{uuid.uuid4().hex[:8]}")
    agent_id = Column(String, ForeignKey("agents.id"), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    event_count = Column(Integer, default=0)
    fingerprint = Column(Text, nullable=True)
    embedding = Column(JSON, nullable=True)

    agent = relationship("Agent", back_populates="sessions")
    events = relationship("Event", back_populates="session")


class Event(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True, default=lambda: f"evt_{uuid.uuid4().hex[:8]}")
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    type = Column(String(50), nullable=False)
    tool = Column(String(255), nullable=True)
    action = Column(String(255), nullable=True)
    resource = Column(String(255), nullable=True)
    status = Column(String(50), nullable=False)

    session = relationship("Session", back_populates="events")


class Pattern(Base):
    __tablename__ = "patterns"

    id = Column(String, primary_key=True, default=lambda: f"pattern_{uuid.uuid4().hex[:8]}")
    name = Column(String(100), nullable=False)
    severity = Column(String(20), nullable=False)
    confidence = Column(Float, nullable=False, default=0.0)
    affected_sessions = Column(Integer, default=0)
    affected_agents = Column(Integer, default=0)
    common_tools = Column(JSON, default=list)
    common_actions = Column(JSON, default=list)
    llm_explanation = Column(Text, nullable=True)
    detected_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    risk_score = Column(Float, nullable=True)
    cluster_id = Column(Integer, nullable=True)