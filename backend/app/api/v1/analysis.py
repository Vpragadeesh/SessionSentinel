from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from app.db.database import get_db
from app.models import Session, Event, Pattern, Agent
from app.services.fingerprint import build_fingerprint, build_canonical_string
from app.services.embeddings import generate_embedding, generate_all_embeddings, load_model
from app.services.clustering import run_clustering, group_sessions_by_cluster, compute_cluster_stats
from app.services.pattern_engine import run_agent_detectors
from app.services.agent_risk_engine import update_agent_risk
from app.services.alert_engine import process_alerts
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
    4. Run Agent-level behavioral detectors
    5. Update Agent risk scores (with exponential decay)
    6. Generate alerts for threshold breaches
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

    if len(all_sessions) >= 5:
        session_ids = [s.id for s in all_sessions]
        embeddings = [s.embedding for s in all_sessions]

        labels = run_clustering(embeddings)
        clusters = group_sessions_by_cluster(session_ids, labels)

        unique_clusters = [c for c in clusters.keys() if c != -1]
        noise_count = len(clusters.get(-1, []))
        logger.info(f"Found {len(unique_clusters)} clusters, {noise_count} noise points")
        
        # Save patterns to DB
        await db.execute(delete(Pattern))
        
        for cluster_id, c_session_ids in clusters.items():
            if cluster_id == -1:
                continue
                
            c_sessions = [s for s in all_sessions if s.id in c_session_ids]
            c_agents = set([s.agent_id for s in c_sessions])
            stats = compute_cluster_stats(c_sessions)
            
            # Note: We won't generate LLM explanations synchronously here because it's slow, 
            # we just persist the stats. 
            sensitive_ratio = stats.get("sensitive_ratio", 0.0)
            
            p = Pattern(
                name=f"Cluster {cluster_id}",
                severity="HIGH" if sensitive_ratio > 0.5 else "MEDIUM",
                confidence=round(stats.get("avg_similarity", 0.0), 2),
                affected_sessions=len(c_sessions),
                affected_agents=len(c_agents),
                common_tools=list(stats.get("common_tools", [])),
                common_actions=list(stats.get("common_actions", [])),
                cluster_id=cluster_id
            )
            db.add(p)
        await db.commit()

    # ── Step 4: Run Agent-level behavioral detectors ───────────────────────
    result = await db.execute(
        select(Agent).options(selectinload(Agent.sessions).selectinload(Session.events))
    )
    all_agents = result.scalars().all()
    
    agent_detections = await run_agent_detectors(all_agents)
    
    # ── Step 5 & 6: Update Risk & Generate Alerts ──────────────────────────
    alerts_created_count = 0
    for agent in all_agents:
        if agent.id in agent_detections:
            results = agent_detections[agent.id]
            # Update risk score
            await update_agent_risk(db, agent, results)
            # Process alerts
            await process_alerts(db, agent, results)
            alerts_created_count += len(results)
        else:
            # Decay risk even if no new detections
            await update_agent_risk(db, agent, [])

    return {
        "message": "Analysis complete",
        "agents_analyzed": len(all_agents),
        "detections_found": len(agent_detections),
        "alerts_processed": alerts_created_count
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
        agent_id = session_data["agent_id"]  # old format fallback

        result = await db.execute(select(Agent).where(Agent.id == agent_id))
        if not result.scalar_one_or_none():
            agent = Agent(
                id=agent_id,
                name=session_data.get("agent_name", f"Agent-{agent_id[-4:]}"),
                type="attack-simulation",
            )
            db.add(agent)

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
    """
    from simulator.generator import generate_normal_sessions
    from datetime import datetime

    await db.execute(delete(Pattern))
    await db.execute(delete(Event))
    await db.execute(delete(Session))
    await db.commit()
    logger.info("Database wiped for demo reset.")

    normal_sessions = generate_normal_sessions(25)
    sessions_created = 0
    events_created = 0

    for session_data in normal_sessions:
        agent_id = session_data["agent_id"]

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