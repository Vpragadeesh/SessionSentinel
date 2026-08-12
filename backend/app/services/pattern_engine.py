from app.models import Pattern, Session
from app.services.clustering import compute_cluster_stats
from typing import List, Dict, Any, Optional

# ── Detection Thresholds ────────────────────────────────────────────────────
MIN_CLUSTER_SIZE = 5
SIMILARITY_THRESHOLD = 0.80   # lowered slightly from 0.85 to account for noise
SENSITIVE_RATIO_THRESHOLD = 0.3  # ratio of sessions with sensitive fingerprint terms


def classify_pattern(cluster_stats: Dict[str, Any]) -> Optional[str]:
    """
    Inspect cluster stats and return a named pattern type, or None if benign.
    Checks in priority order: data_probing > credential > tool_enum > exfil_prep
    """
    size = cluster_stats.get("size", 0)
    avg_sim = cluster_stats.get("avg_similarity", 0.0)
    sensitive_ratio = cluster_stats.get("sensitive_ratio", 0.0)
    actions = set(cluster_stats.get("common_actions", []))

    # Must meet baseline thresholds
    if size < MIN_CLUSTER_SIZE:
        return None
    if avg_sim < SIMILARITY_THRESHOLD:
        return None

    # ── Pattern A: progressive_data_probing ───────────────────────────────
    # Repeated access to PII fields (email, phone, address, ssn)
    pii_actions = {"get_email", "get_phone", "get_address", "get_ssn", "get_credit_card"}
    pii_hits = len(actions & pii_actions)
    if pii_hits >= 2:
        return "progressive_data_probing"

    # ── Pattern C: credential_harvesting ─────────────────────────────────
    # Auth token/key/password access
    auth_actions = {"get_token", "get_key", "get_password", "authenticate", "refresh_token"}
    auth_hits = len(actions & auth_actions)
    if auth_hits >= 2:
        return "credential_harvesting"

    # ── Pattern B: tool_enumeration ───────────────────────────────────────
    # Broad probing: many distinct actions across many tools
    tools = cluster_stats.get("common_tools", [])
    if len(actions) >= 8 or len(tools) >= 3:
        return "tool_enumeration"

    # ── Pattern D: data_exfiltration_prep ────────────────────────────────
    # Large read/list/search/export sequences
    read_actions = {"read", "list", "search", "export", "download", "get"}
    read_hits = len(actions & read_actions)
    if read_hits >= 3 and sensitive_ratio >= SENSITIVE_RATIO_THRESHOLD:
        return "data_exfiltration_prep"

    return None


async def analyze_all_clusters(
    clusters: Dict[int, List[str]],
    all_sessions: List[Session],
    db: Any = None,  # kept for API compatibility, not used internally
) -> List[Pattern]:
    """
    Iterate over all non-noise clusters, compute stats, classify pattern,
    and return a list of Pattern ORM objects (not yet persisted).
    """
    patterns: List[Pattern] = []
    session_map = {s.id: s for s in all_sessions}

    for cluster_id, session_ids in clusters.items():
        if cluster_id == -1:  # Skip noise
            continue

        cluster_sessions = [session_map[sid] for sid in session_ids if sid in session_map]
        if not cluster_sessions:
            continue

        stats = compute_cluster_stats(cluster_sessions)
        pattern_name = classify_pattern(stats)

        if pattern_name:
            agent_ids = {s.agent_id for s in cluster_sessions}
            pattern = Pattern(
                name=pattern_name,
                severity="MEDIUM",          # overwritten by risk engine
                confidence=round(stats["avg_similarity"], 4),
                affected_sessions=len(cluster_sessions),
                affected_agents=len(agent_ids),
                common_tools=sorted(stats.get("common_tools", [])),
                common_actions=sorted(stats.get("common_actions", [])),
                cluster_id=cluster_id,
            )
            patterns.append(pattern)

    return patterns