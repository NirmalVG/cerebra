# app/services/embeddings.py
"""
Lightweight semantic search using TF-IDF + cosine similarity.

Replaces sentence-transformers + torch + FAISS entirely.
RAM usage: ~80MB total vs ~400MB+ with torch.

Why TF-IDF works well here:
- Knowledge nodes have rich, distinct vocabulary (quantum, entropy, renaissance...)
- TF-IDF captures term importance within the corpus automatically
- Cosine similarity on TF-IDF vectors gives solid semantic matching
- sklearn's implementation is pure numpy/scipy — no GPU, no torch
- 2000 nodes x 10k features fits comfortably in ~50MB RAM

Tradeoff: loses deep semantic understanding (synonyms, paraphrasing).
For this knowledge graph with precise domain vocabulary, the practical
difference from MiniLM is minimal.
"""

import numpy as np
from typing import List, Tuple

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# State (built once at startup, kept in memory)
_vectorizer: TfidfVectorizer | None = None
_matrix = None          # sparse matrix: (n_nodes, n_features)
_node_ids: List[str] = []


def _build_text(node: dict) -> str:
    """
    Build a rich text document from a node for TF-IDF indexing.

    We repeat the title and domain to boost their TF-IDF weight.
    TF-IDF scores terms by frequency within a document,
    so repeating key terms increases their importance score.
    """
    title   = node.get("title", "")
    domain  = node.get("domain", "")
    tags    = " ".join(node.get("tags", []))
    summary = node.get("summary_override", "").strip()

    # First 3 sentences of summary
    if summary:
        sentences = summary.split(". ")
        summary = ". ".join(sentences[:3])

    # Title x3 and domain x2 to boost their TF-IDF weight
    parts = [
        title, title, title,
        domain, domain,
        tags,
        summary,
    ]
    return " ".join(p for p in parts if p)


def build_index(nodes: List[dict]) -> None:
    """
    Build TF-IDF index from all nodes.
    Called once at FastAPI startup via lifespan context.

    TfidfVectorizer params:
    - ngram_range=(1,2): captures both single words and two-word phrases
      e.g. "quantum" AND "quantum entanglement" as features
    - max_features=15000: vocabulary cap to control memory
    - min_df=1: include even rare terms (important for niche concepts)
    - sublinear_tf=True: log-scale term frequency, reduces dominance
      of very common terms
    """
    global _vectorizer, _matrix, _node_ids

    print(f"Building TF-IDF index for {len(nodes)} nodes...")

    texts    = [_build_text(n) for n in nodes]
    node_ids = [n["id"] for n in nodes]

    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        max_features=15000,
        min_df=1,
        sublinear_tf=True,
        strip_accents='unicode',
        analyzer='word',
        token_pattern=r'\b[a-zA-Z][a-zA-Z0-9\-]{1,}\b',
    )

    matrix = vectorizer.fit_transform(texts)

    _vectorizer = vectorizer
    _matrix     = matrix
    _node_ids   = node_ids

    n_features = matrix.shape[1]
    print(f"TF-IDF index built: {matrix.shape[0]} nodes, {n_features} features")


def search(query: str, top_k: int = 10) -> List[Tuple[str, float]]:
    """
    Find the top_k most similar nodes to a query string.

    Returns list of (node_id, similarity_score) tuples,
    sorted by score descending. Scores are cosine similarities [0, 1].
    """
    if _vectorizer is None or _matrix is None or not _node_ids:
        return []

    query_vec = _vectorizer.transform([query])
    similarities = cosine_similarity(query_vec, _matrix)[0]

    k = min(top_k, len(_node_ids))
    top_indices = np.argpartition(similarities, -k)[-k:]
    top_indices = top_indices[np.argsort(similarities[top_indices])[::-1]]

    results = []
    for idx in top_indices:
        score = float(similarities[idx])
        if score > 0.0:
            results.append((_node_ids[idx], score))

    return results


def cache_size() -> int:
    """Number of nodes currently indexed. Used by /health endpoint."""
    return len(_node_ids)