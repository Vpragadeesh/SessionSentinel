import re
from typing import Optional, List, Dict, Any, Set
from .common import DetectionResult, AgentHistory


def _extract_category(resource: str) -> Optional[str]:
    """
    Extract and normalize resource namespace/category from structured or wildcard resource strings.
    E.g.:
      'customer.*' -> 'customer'
      'order.*' -> 'order'
      'product.*' -> 'product'
      'user.*' -> 'user'
      'analytics.*' -> 'analytics'
      'inventory.*' -> 'inventory'
      'payment.*' -> 'payment'
      'shipping.*' -> 'shipping'
    """
    if not resource:
        return None
    res = resource.strip()
    match = re.match(r"^([a-zA-Z0-9_-]+)[\.:/]\*", res)
    if match:
        return match.group(1).lower()
    if res in ("*", "*.*"):
        return "*"
    return None


def _detect_numeric(history: AgentHistory) -> Optional[DetectionResult]:
    sessions = history.sessions
    if not sessions:
        return None

    identifiers: List[int] = []

    for session in sessions:
        for event in session.events:
            resource = event.resource or event.action or ""
            matches = re.findall(r"\d+", resource)
            if matches:
                identifiers.append(int(matches[-1]))

    if len(identifiers) < 10:
        return None

    identifiers.sort()

    sequential_count = 0
    for i in range(1, len(identifiers)):
        diff = identifiers[i] - identifiers[i - 1]
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
            "sequentiality_score": round(sequentiality, 2),
            "mode": "numeric"
        },
    )


def _detect_resource_category(history: AgentHistory) -> Optional[DetectionResult]:
    sessions = history.sessions
    if not sessions:
        return None

    all_categories: List[str] = []
    sessions_with_wildcards = 0
    sessions_with_multi_category = 0
    total_wildcard_events = 0

    for session in sessions:
        session_cats: Set[str] = set()
        for event in session.events:
            resource = event.resource or event.action or ""
            cat = _extract_category(resource)
            if cat:
                session_cats.add(cat)
                all_categories.append(cat)
                total_wildcard_events += 1

        if session_cats:
            sessions_with_wildcards += 1
        if len(session_cats) >= 2:
            sessions_with_multi_category += 1

    unique_categories = set(all_categories)

    # Require multiple distinct categories and multiple events/sessions to avoid flagging isolated single-resource queries
    if len(unique_categories) < 3 or total_wildcard_events < 4 or sessions_with_wildcards < 2:
        return None

    breadth_score = min(len(unique_categories) / 6.0, 1.0)
    coverage_score = min(total_wildcard_events / 15.0, 1.0)
    repetition_score = min(sessions_with_wildcards / max(len(sessions), 1), 1.0)
    regularity_score = min(sessions_with_multi_category / max(sessions_with_wildcards, 1), 1.0)

    score = (0.40 * breadth_score) + (0.30 * coverage_score) + (0.20 * repetition_score) + (0.10 * regularity_score)
    confidence = (0.50 * breadth_score) + (0.30 * repetition_score) + (0.20 * regularity_score)

    if score < 0.5:
        return None

    return DetectionResult(
        technique="Systematic Enumeration",
        score=round(score, 2),
        confidence=round(confidence, 2),
        evidence={
            "sessions": len(sessions),
            "unique_targets_enumerated": len(unique_categories),
            "categories": sorted(list(unique_categories)),
            "enumeration_sessions": sessions_with_wildcards,
            "total_wildcard_probes": total_wildcard_events,
            "sequentiality_score": round(breadth_score, 2),
            "mode": "resource_category"
        },
    )


def detect(history: AgentHistory) -> Optional[DetectionResult]:
    numeric_res = _detect_numeric(history)
    resource_res = _detect_resource_category(history)

    if numeric_res and resource_res:
        return numeric_res if numeric_res.score >= resource_res.score else resource_res
    return numeric_res or resource_res
