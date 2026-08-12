from sklearn.cluster import DBSCAN
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from typing import List, Dict, Any


def run_clustering(embeddings_matrix: List[List[float]]) -> List[int]:
    X = np.array(embeddings_matrix)
    # eps=0.15 on cosine distance = sessions must be >=85% similar to cluster together
    # min_samples=3 allows small adversarial groups (e.g. 30 credential_harvesting sessions) to form clusters
    dbscan = DBSCAN(eps=0.15, min_samples=3, metric="cosine")
    labels = dbscan.fit_predict(X)
    return labels.tolist()



def group_sessions_by_cluster(session_ids: List[str], labels: List[int]) -> Dict[int, List[str]]:
    clusters = {}
    for session_id, label in zip(session_ids, labels):
        if label not in clusters:
            clusters[label] = []
        clusters[label].append(session_id)
    return clusters


def compute_cluster_stats(sessions: List[Any]) -> Dict[str, Any]:
    if not sessions:
        return {}
    
    # Compute average pairwise similarity
    embeddings = [s.embedding for s in sessions if s.embedding]
    avg_similarity = 0.0
    if len(embeddings) >= 2:
        similarities = []
        for i in range(len(embeddings)):
            for j in range(i + 1, len(embeddings)):
                sim = cosine_similarity([embeddings[i]], [embeddings[j]])[0][0]
                similarities.append(sim)
        avg_similarity = float(np.mean(similarities)) if similarities else 0.0
    
    # Common tools and actions
    all_tools = set()
    all_actions = set()
    sensitive_count = 0
    total_resources = 0
    
    for session in sessions:
        if session.fingerprint:
            # Parse fingerprint
            parts = session.fingerprint.split(" | ")
            if len(parts) == 2:
                tool = parts[0]
                actions = parts[1].split(" → ")
                all_tools.add(tool)
                all_actions.update(actions)
    
    # Estimate sensitive ratio from fingerprint
    sensitive_keywords = {"email", "phone", "address", "token", "key", "password", "ssn"}
    for session in sessions:
        if session.fingerprint:
            for kw in sensitive_keywords:
                if kw in session.fingerprint.lower():
                    sensitive_count += 1
            total_resources += len(session.fingerprint.split(" → "))
    
    sensitive_ratio = sensitive_count / max(total_resources, 1)
    
    return {
        "size": len(sessions),
        "avg_similarity": avg_similarity,
        "common_tools": list(all_tools),
        "common_actions": list(all_actions),
        "sensitive_ratio": sensitive_ratio
    }