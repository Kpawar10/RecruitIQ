"""
RAG (Retrieval-Augmented Generation) for resume Q&A.
Uses FAISS for fast similarity search over chunked resume text.
"""

import numpy as np
from services.embeddings import get_embeddings_batch, get_embedding, compute_similarity


class ResumeRAG:
    """Chunk a resume into paragraphs, embed them, and retrieve relevant chunks for Q&A."""

    def __init__(self, text: str, chunk_size: int = 300):
        self.chunks = self._chunk(text, chunk_size)
        self._build_index()

    def _chunk(self, text: str, chunk_size: int) -> list[str]:
        """Split by double newlines, then further split long chunks."""
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        chunks = []
        for para in paragraphs:
            words = para.split()
            if len(words) <= chunk_size:
                chunks.append(para)
            else:
                # sliding window for long paragraphs
                for i in range(0, len(words), chunk_size // 2):
                    chunk = " ".join(words[i : i + chunk_size])
                    if chunk:
                        chunks.append(chunk)
        return chunks if chunks else [text[:2000]]

    def _build_index(self):
        """Build FAISS index from chunk embeddings."""
        try:
            import faiss

            embeddings = get_embeddings_batch(self.chunks)
            self.embeddings = embeddings.astype(np.float32)

            dim = self.embeddings.shape[1]
            self.index = faiss.IndexFlatIP(dim)  # Inner product = cosine for normalized vecs
            faiss.normalize_L2(self.embeddings)
            self.index.add(self.embeddings)
            self._use_faiss = True

        except ImportError:
            # Fallback: numpy dot product
            self.embeddings = get_embeddings_batch(self.chunks)
            self._use_faiss = False

    def retrieve(self, question: str, k: int = 4) -> list[str]:
        """Return top-k most relevant chunks for a question."""
        q_emb = get_embedding(question).astype(np.float32)

        if self._use_faiss:
            import faiss
            q_emb_2d = q_emb.reshape(1, -1)
            faiss.normalize_L2(q_emb_2d)
            D, I = self.index.search(q_emb_2d, min(k, len(self.chunks)))
            return [self.chunks[i] for i in I[0] if i < len(self.chunks)]
        else:
            # Numpy fallback
            scores = self.embeddings @ q_emb
            top_k = np.argsort(scores)[::-1][:k]
            return [self.chunks[i] for i in top_k]