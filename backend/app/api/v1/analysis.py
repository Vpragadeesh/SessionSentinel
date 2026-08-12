from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.db.database import get_db
from app.models import Session, Event, Pattern, Agent
from app.services.fingerprint import build_fingerprint, build_canonical_string
from app.services.embeddings import generate_embedding, generate_all_embeddings, load_model
from app.services.clustering import run_clustering, group_sessions_by_cluster, compute_cluster_stats
from app.services.pattern_engine import analyze_all_clusters
from app.services.risk_engine import compute_risk_score, score_to_level
from app.services.llm.service import generate_pattern_explanation
from app.config import settings
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post("/run")
async def run_analysis(db: AsyncSession = Depends(get_db)):
    """
    Full detection pipeline:
    1. Fingerprint all sessions that don't have one yet
    2. Generate embeddings for all fingerprinted sessions
    3. Cluster all session vectors (DBSCAN)
    4. Analyze clusters for adversarial patterns
    5. Score risk for each pattern
    6. Generate LLM explanations
    """
    # ── Step 1: Fingerprint sessions ───────────────────────────────────────
    result = await db.execute(
        select(Session).where(Session.fingerprint.is_(None))
    )
    sessions_without_fp = result.scalars().all()
    logger.info(f"Fingerprinting {len(sessions_without_fp)} sessions ...")

    load_model()  # Preload sentence transformer

    for session in sessions_without_fp:
        fp_data = await build_fingerprint(session.id, db)
        canonical = build_canonical_string(fp_data)
        if not canonical or canonical == "unknown | ":
            continue
        session.fingerprint = canonical

    await db.commit()

    # ── Step 2: Generate embeddings for sessions without one ───────────────
    result = await db.execute(
        select(Session).where(
            Session.fingerprint.is_not(None),
            Session.embedding.is_(None)
        )
    )
    sessions_without_emb = result.scalars().all()
    logger.info(f"Generating embeddings for {len(sessions_without_emb)} sessions ...")

    if sessions_without_emb:
        fingerprint_map = {s.id: s.fingerprint for s in sessions_without_emb}
        embeddings_map = generate_all_embeddings(fingerprint_map)
        for session in sessions_without_emb:
            session.embedding = embeddings_map.get(session.id)
        await db.commit()

    # ── Step 3: Load all sessions with embeddings ──────────────────────────
    result = await db.execute(
        select(Session).where(Session.embedding.is_not(None))
    )
    all_sessions = result.scalars().all()
    logger.info(f"Clustering {len(all_sessions)} sessions ...")

    if len(all_sessions) < 5:
        return {
            "message": "Not enough sessions for clustering",
            "sessions_count": len(all_sessions)
        }

    session_ids = [s.id for s in all_sessions]
    embeddings = [s.embedding for s in all_sessions]

    # ── Step 4: Cluster ────────────────────────────────────────────────────
    labels = run_clustering(embeddings)
    clusters = group_sessions_by_cluster(session_ids, labels)

    unique_clusters = [c for c in clusters.keys() if c != -1]
    noise_count = len(clusters.get(-1, []))
    logger.info(f"Found {len(unique_clusters)} clusters, {noise_count} noise points")

    # ── Step 5 & 6: Detect patterns + score risk + explain ─────────────────
    # Clear old patterns before re-running
    await db.execute(delete(Pattern))
    await db.commit()

    patterns = await analyze_all_clusters(clusters, all_sessions, db)

    saved_patterns = []
    for pattern in patterns:
        cluster_sessions = [
            s for s in all_sessions
            if s.id in clusters.get(pattern.cluster_id, [])
        ]
        cluster_stats = compute_cluster_stats(cluster_sessions)

        # Risk scoring
        risk_score = compute_risk_score(cluster_stats)
        pattern.risk_score = risk_score
        pattern.severity = score_to_level(risk_score)

        # LLM explanation
        pattern_data = {
            "pattern": pattern.name,
            "affected_sessions": pattern.affected_sessions,
            "similarity": cluster_stats.get("avg_similarity", 0),
            "tools": pattern.common_tools or [],
            "resources": pattern.common_actions or [],
            "risk": pattern.severity,
        }
        try:
            explanation = await generate_pattern_explanation(pattern_data)
            pattern.llm_explanation = explanation
        except Exception as e:
            logger.warning(f"LLM explanation failed: {e}")
            pattern.llm_explanation = (
                f"[Auto] {pattern.affected_sessions} sessions showed "
                f"{pattern.confidence:.0%} behavioral similarity. "
                f"Pattern: {pattern.name}. Risk: {pattern.severity}."
            )

        db.add(pattern)
        saved_patterns.append(pattern)
        
        # Update risk scores for affected agents
        agent_ids = {s.agent_id for s in cluster_sessions}
        if agent_ids:
            # Fetch agents
            result = await db.execute(select(Agent).where(Agent.id.in_(agent_ids)))
            agents = result.scalars().all()
            
            now = datetime.now(timezone.utc)
            reset_td = timedelta(hours=settings.agent_inactivity_reset_hours)
            
            for agent in agents:
                # Check for decay/reset
                if agent.last_risk_update_at:
                    # Make sure last_risk_update_at is timezone-aware
                    last_update = agent.last_risk_update_at
                    if last_update.tzinfo is None:
                        last_update = last_update.replace(tzinfo=timezone.utc)
                        
                    time_since_last = now - last_update
                    if time_since_last > reset_td:
                        agent.current_risk_score = 0.0
                else:
                    if agent.current_risk_score is None:
                        agent.current_risk_score = 0.0
                        
                # Accumulate risk
                agent.current_risk_score += risk_score
                agent.last_risk_update_at = now

    await db.commit()

    return {
        "message": "Analysis complete",
        "sessions_analyzed": len(all_sessions),
        "clusters_found": len(unique_clusters),
        "noise_sessions": noise_count,
        "patterns_detected": len(saved_patterns),
        "patterns": [
            {
                "name": p.name,
                "severity": p.severity,
                "confidence": round(p.confidence, 3),
                "affected_sessions": p.affected_sessions,
                "affected_agents": p.affected_agents,
                "risk_score": round(p.risk_score, 3) if p.risk_score else None,
            }
            for p in saved_patterns
        ],
    }


@router.post("/sessions/inject-attack")
async def inject_attack_sessions(db: AsyncSession = Depends(get_db)):
    """
    Inject 50 coordinated adversarial sessions for the live demo.
    """
    from simulator.generator import generate_attack_sessions
    from datetime import datetime

    attack_sessions = generate_attack_sessions(50)
    sessions_created = 0
    events_created = 0

    for session_data in attack_sessions:
        agent_id = session_data["agent_id"]

        # Upsert agent
        result = await db.execute(select(Agent).where(Agent.id == agent_id))
        if not result.scalar_one_or_none():
            agent = Agent(
                id=agent_id,
                name=session_data.get("agent_name", f"Agent-{agent_id[-4:]}"),
                type="attack-simulation",
            )
            db.add(agent)

        # Skip duplicate sessions
        result = await db.execute(select(Session).where(Session.id == session_data["id"]))
        if result.scalar_one_or_none():
            continue

        def parse_dt(val):
            if isinstance(val, str):
                if val.endswith("Z"):
                    val = val[:-1] + "+00:00"
                return datetime.fromisoformat(val)
            return val

        session = Session(
            id=session_data["id"],
            agent_id=agent_id,
            started_at=parse_dt(session_data["started_at"]),
            ended_at=parse_dt(session_data["ended_at"]) if session_data.get("ended_at") else None,
            event_count=len(session_data.get("events", [])),
        )
        db.add(session)
        sessions_created += 1

        for evt in session_data.get("events", []):
            event = Event(
                id=evt["id"],
                session_id=session_data["id"],
                timestamp=parse_dt(evt["timestamp"]),
                type=evt.get("type", "tool_call"),
                tool=evt.get("tool"),
                action=evt.get("action"),
                resource=evt.get("resource"),
                status=evt.get("status", "success"),
            )
            db.add(event)
            events_created += 1

    await db.commit()
    return {
        "message": f"Injected {sessions_created} attack sessions ({events_created} events). Run /analysis/run to detect patterns."
    }

@router.post("/demo/reset")
async def reset_demo_environment(db: AsyncSession = Depends(get_db)):
    """
    Reset the environment for the live demo.
    1. Deletes all patterns, events, and sessions.
    2. Generates 1,000 baseline normal sessions (NO attacks).
    """
    from simulator.generator import generate_normal_sessions
    from datetime import datetime

    # Wipe tables
    await db.execute(delete(Pattern))
    await db.execute(delete(Event))
    await db.execute(delete(Session))
    await db.commit()
    logger.info("Database wiped for demo reset.")

    # Generate 25 normal baseline sessions
    normal_sessions = generate_normal_sessions(25)
    sessions_created = 0
    events_created = 0

    for session_data in normal_sessions:
        agent_id = session_data["agent_id"]

        # Upsert agent
        result = await db.execute(select(Agent).where(Agent.id == agent_id))
        if not result.scalar_one_or_none():
            agent = Agent(
                id=agent_id,
                name=session_data.get("agent_name", f"Agent-{agent_id[-4:]}"),
                type="support",
            )
            db.add(agent)

        def parse_dt(val):
            if isinstance(val, str):
                if val.endswith("Z"):
                    val = val[:-1] + "+00:00"
                return datetime.fromisoformat(val)
            return val

        session = Session(
            id=session_data["id"],
            agent_id=agent_id,
            started_at=parse_dt(session_data["started_at"]),
            ended_at=parse_dt(session_data["ended_at"]) if session_data.get("ended_at") else None,
            event_count=len(session_data.get("events", [])),
        )
        db.add(session)
        sessions_created += 1

        for evt in session_data.get("events", []):
            event = Event(
                id=evt["id"],
                session_id=session_data["id"],
                timestamp=parse_dt(evt["timestamp"]),
                type=evt.get("type", "tool_call"),
                tool=evt.get("tool"),
                action=evt.get("action"),
                resource=evt.get("resource"),
                status=evt.get("status", "success"),
            )
            db.add(event)
            events_created += 1

    await db.commit()
    logger.info(f"Generated {sessions_created} baseline sessions.")

    return {
        "message": "Environment reset with 25 baseline sessions. System is in NORMAL state."
    }