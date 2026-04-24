# app/services/embeddings.py
import os
os.environ["TOKENIZERS_PARALLELISM"] = "false" 
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
from typing import List, Tuple

print("Loading bge-large embedding model (~1.3GB, first run only)...")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("Embedding model loaded.")

_index: faiss.IndexFlatIP | None = None
_node_ids: List[str] = []
_node_texts: List[str] = []


def _build_text(node: dict) -> str:
    # Remove the "Represent this knowledge concept:" prefix
    parts = [
        node["title"],
        f"Domain: {node['domain']}",
        f"Tags: {', '.join(node.get('tags', []))}",
    ]
    summary = node.get("summary_override", "").strip()
    if summary:
        sentences = summary.split(". ")
        parts.append(". ".join(sentences[:2]))
    return " | ".join(parts)


def build_index(nodes: List[dict]) -> None:
    global _index, _node_ids, _node_texts

    texts    = [_build_text(n) for n in nodes]
    node_ids = [n["id"] for n in nodes]

    print(f"Building bge-large embeddings for {len(texts)} nodes...")

    embeddings = model.encode(
    texts,
    normalize_embeddings=True,
    show_progress_bar=True,
    batch_size=32,   # was 16 for bge-large, MiniLM handles 32 fine
)

    dimension = embeddings.shape[1]  # 1024 for bge-large
    index = faiss.IndexFlatIP(dimension)
    index.add(embeddings.astype(np.float32))

    _index    = index
    _node_ids = node_ids
    _node_texts = texts

    print(f"FAISS index built: {index.ntotal} vectors, {dimension}d")


def search(query: str, top_k: int = 10) -> list:
    if _index is None or _index.ntotal == 0:
        return []

    # No prefix needed for MiniLM
    query_emb = model.encode(
        [query],
        normalize_embeddings=True,
    ).astype(np.float32)

    scores, indices = _index.search(query_emb, min(top_k, _index.ntotal))

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx == -1:
            continue
        results.append((_node_ids[idx], float(score)))
    return results