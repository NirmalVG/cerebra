# app/services/embeddings.py
"""
Sentence embedding + FAISS vector search.

Optimized for Render free tier (512MB RAM):
- CPU-only torch (no CUDA packages loaded)
- Single-threaded to avoid memory spikes
- Small batch encoding
- MiniLM-L6-v2 (22MB model, 384d embeddings)
"""

import os

# ── Must be set before any torch/transformers import ──────────
# Prevents tokenizer parallelism deadlock in forked processes
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# Disable HuggingFace telemetry / progress bars in production
os.environ["HF_HUB_DISABLE_PROGRESS_BARS"] = "1"
os.environ["TRANSFORMERS_VERBOSITY"] = "error"

import numpy as np
from typing import List, Tuple

# Force CPU before sentence_transformers loads torch
import torch
torch.set_num_threads(1)   # Render free tier is single-core — no benefit from more

from sentence_transformers import SentenceTransformer

# ── Model ─────────────────────────────────────────────────────
# all-MiniLM-L6-v2:
#   - 22MB download (cached after first run)
#   - 384-dimensional embeddings
#   - Fast inference on CPU (~200ms for 2000 nodes at startup)
#   - Good semantic quality for knowledge retrieval
print("Loading embedding model (all-MiniLM-L6-v2)...")
model = SentenceTransformer('all-MiniLM-L6-v2', device='cpu')
print("Embedding model loaded.")

# ── FAISS index (built once at startup, kept in memory) ───────
import faiss

_index: faiss.IndexFlatIP | None = None
_node_ids: List[str] = []
_node_texts: List[str] = []


def _build_text(node: dict) -> str:
    """
    Build a rich text representation of a node for embedding.

    More context = better semantic matching.
    We combine title + domain + tags + first 2 sentences of summary.
    This gives the model enough signal to distinguish e.g.
    "entropy (thermodynamics)" from "entropy (information theory)".
    """
    parts = [
        node["title"],
        f"Domain: {node['domain']}",
        f"Tags: {', '.join(node.get('tags', []))}",
    ]

    summary = node.get("summary_override", "").strip()
    if summary:
        sentences = summary.split(". ")
        short = ". ".join(sentences[:2])
        if short and not short.endswith("."):
            short += "."
        parts.append(short)

    return " | ".join(parts)


def build_index(nodes: List[dict]) -> None:
    """
    Build FAISS index from all nodes.
    Called once at FastAPI startup via lifespan context.

    Uses IndexFlatIP (exact inner product search).
    On normalized vectors, inner product == cosine similarity.
    At 2000 nodes, exact search is fast enough — no need for
    approximate methods like HNSW or IVF.
    """
    global _index, _node_ids, _node_texts

    texts    = [_build_text(n) for n in nodes]
    node_ids = [n["id"] for n in nodes]

    print(f"Building embeddings for {len(texts)} nodes...")

    # Encode in small batches to keep peak memory low
    # 16 nodes per batch at 384d ≈ very small memory footprint
    embeddings = model.encode(
        texts,
        normalize_embeddings=True,   # unit vectors → cosine sim = dot product
        show_progress_bar=False,     # no stdout spam in production logs
        batch_size=16,               # small = lower peak RAM
        convert_to_numpy=True,       # returns np.ndarray directly
        device='cpu',
    )

    dimension = embeddings.shape[1]  # 384 for MiniLM

    index = faiss.IndexFlatIP(dimension)
    index.add(embeddings.astype(np.float32))

    _index     = index
    _node_ids  = node_ids
    _node_texts = texts

    print(f"FAISS index built: {index.ntotal} vectors, {dimension}d")


def search(query: str, top_k: int = 10) -> List[Tuple[str, float]]:
    """
    Find the top_k most semantically similar nodes to a query string.

    Returns a list of (node_id, similarity_score) tuples,
    sorted by score descending (best match first).

    Similarity scores are cosine similarities in range [-1, 1].
    In practice, relevant matches score > 0.3,
    and strong matches score > 0.6.
    """
    if _index is None or _index.ntotal == 0:
        return []

    # Embed the query with same model + normalization as the index
    query_embedding = model.encode(
        [query],
        normalize_embeddings=True,
        device='cpu',
        convert_to_numpy=True,
    ).astype(np.float32)

    # Search — returns (distances, indices) each of shape (1, top_k)
    k = min(top_k, _index.ntotal)
    scores, indices = _index.search(query_embedding, k)

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx == -1:    # FAISS returns -1 for unfilled slots
            continue
        results.append((_node_ids[idx], float(score)))

    return results


def cache_size() -> int:
    """
    Number of nodes currently indexed.
    Used by the /health endpoint to confirm startup completed.
    Returns 0 if the index hasn't been built yet.
    """
    if _index is None:
        return 0
    return _index.ntotal