"""Embeddings service — SentenceTransformer with a simple LRU cache."""

import numpy as np
from functools import lru_cache
from sklearn.metrics.pairwise import cosine_similarity as sk_cosine

# Lazy load — model is heavy, only load once
_model = None


def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def get_embedding(text: str) -> np.ndarray:
    """Encode a single string into a 1D embedding vector."""
    model = _get_model()
    embedding = model.encode([text], normalize_embeddings=True)
    return embedding[0]  # 1D array


def get_embeddings_batch(texts: list[str]) -> np.ndarray:
    """Encode multiple strings — returns 2D array (N, dim)."""
    model = _get_model()
    return model.encode(texts, normalize_embeddings=True)


def compute_similarity(emb1: np.ndarray, emb2: np.ndarray) -> float:
    """Cosine similarity between two 1D embedding vectors."""
    # reshape to 2D for sklearn
    a = emb1.reshape(1, -1)
    b = emb2.reshape(1, -1)
    return float(sk_cosine(a, b)[0][0])