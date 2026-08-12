from sentence_transformers import SentenceTransformer
from typing import List, Dict
import numpy as np

_model = None


def load_model():
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def generate_embedding(fingerprint_string: str) -> List[float]:
    model = load_model()
    embedding = model.encode(fingerprint_string, convert_to_tensor=False)
    return embedding.tolist()


def generate_all_embeddings(session_fingerprints: Dict[str, str]) -> Dict[str, List[float]]:
    model = load_model()
    fingerprints_list = list(session_fingerprints.values())
    session_ids = list(session_fingerprints.keys())
    
    embeddings = model.encode(fingerprints_list, convert_to_tensor=False, show_progress_bar=True)
    
    return {session_ids[i]: embeddings[i].tolist() for i in range(len(session_ids))}


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    a = np.array(vec_a)
    b = np.array(vec_b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))