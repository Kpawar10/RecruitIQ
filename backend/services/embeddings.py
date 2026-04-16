import numpy as np
from google import genai

client = genai.Client()

def get_embedding(text: str) -> np.ndarray:
    res = client.models.embed_content(
        model="text-embedding-004",
        contents=text
    )
    return np.array(res.embeddings[0].values)


def get_embeddings_batch(texts: list[str]) -> np.ndarray:
    res = client.models.embed_content(
        model="text-embedding-004",
        contents=texts
    )
    return np.array([e.values for e in res.embeddings])


def compute_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))