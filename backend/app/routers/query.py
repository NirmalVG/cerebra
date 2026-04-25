# app/routers/query.py
"""
Three-tier query pipeline:

Tier 1 — FAST (simple factual queries, high FAISS confidence):
  FAISS search → GraphRAG expansion → Synthesize

Tier 2 — AGENTIC (complex cross-domain queries):
  Query decomposition → Multi-cluster search → Path finding → Synthesize

Tier 3 — DYNAMIC (knowledge gap detected, low confidence):
  Tier 2 + Tavily research → Generate new node → Stream node spawn event
"""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
import os
from pathlib import Path
from app.services.embeddings import search
from app.services.graph_rag import GraphRAG
from app.services.research_agent import (
    decompose_query,
    research_and_generate_node,
)
from groq import Groq

router = APIRouter()

SEED_PATH = Path(__file__).parent.parent / "data" / "seed_2000.json"

with open(SEED_PATH, encoding="utf-8") as f:
    _graph = json.load(f)

_nodes_by_id = {n["id"]: n for n in _graph["nodes"]}

# Initialize GraphRAG at module load — stays in memory
graph_rag = GraphRAG(_graph["nodes"], _graph["edges"])

# Confidence threshold below which we trigger dynamic node generation
DYNAMIC_THRESHOLD = 0.05


class QueryRequest(BaseModel):
    query: str
    top_k: int = 10
    enable_dynamic: bool = True   # allow dynamic node generation


SYSTEM_PROMPT = """You are Cerebra — the intelligence behind a living knowledge graph 
spanning all of human understanding. You reason like the world's most well-read polymath,
drawing connections across physics, philosophy, history, biology, mathematics, and art.

You have been given:
1. A set of directly relevant knowledge nodes (with summaries)
2. A subgraph showing HOW these concepts connect to each other
3. Conceptual bridges — paths through the knowledge graph linking distant ideas

Your response structure (in flowing prose, never bullet points):

OPENING INSIGHT: The most non-obvious, intellectually surprising thing about this topic.
Not a definition. The thing an expert would say that makes you lean forward.

DEEP MECHANISM: Explain the underlying logic, not just the fact. Why does it work this way?
What's the structure beneath the surface?

CROSS-DOMAIN RESONANCE: Where does this idea appear in completely different fields?
Use the connection paths in the subgraph as hints. Find the unexpected echoes.

THE STAKES: Why does understanding this change how you see the world?

OPEN TENSION: What remains unresolved, contested, or profound about this topic?
Leave the reader wanting to explore the graph further.

Write 400-600 words. Use precise language — name scientists, dates, theorems.
Take intellectual positions. Respect the reader's intelligence completely."""


def build_context(
    subgraph_nodes: list,
    subgraph_edges: list,
    seed_ids: list[str],
    path_summaries: list[str],
    graph_rag: GraphRAG,
) -> str:
    """
    Build the full context string for the LLM.
    Includes node summaries + connection map + conceptual paths.
    """
    sections = []

    # Section 1: Core relevant nodes (seeds) with full summaries
    seed_nodes = [n for n in subgraph_nodes if n["id"] in set(seed_ids)]
    if seed_nodes:
        node_texts = []
        for node in seed_nodes[:8]:
            summary = node.get("summary_override", "").strip()
            sentences = summary.split(". ")
            short = ". ".join(sentences[:3])
            if short and not short.endswith("."):
                short += "."
            node_texts.append(
                f"[{node['domain'].upper()}] {node['title']}\n"
                f"Tags: {', '.join(node.get('tags', []))}\n"
                f"{short}"
            )
        sections.append(
            "RELEVANT KNOWLEDGE NODES:\n" + "\n\n".join(node_texts)
        )

    # Section 2: Expanded subgraph context (neighbours)
    expansion_nodes = [n for n in subgraph_nodes if n["id"] not in set(seed_ids)]
    if expansion_nodes:
        expansion_titles = [
            f"  • [{n['domain']}] {n['title']}"
            for n in expansion_nodes[:15]
        ]
        sections.append(
            "CONNECTED CONCEPTS (graph neighbours):\n" +
            "\n".join(expansion_titles)
        )

    # Section 3: Connection map
    conn_summary = graph_rag.get_connections_summary(subgraph_nodes, subgraph_edges)
    sections.append(f"CONCEPT CONNECTIONS:\n{conn_summary}")

    # Section 4: Cross-domain paths (bridges between distant concepts)
    if path_summaries:
        sections.append(
            "CONCEPTUAL BRIDGES (paths through the knowledge graph):\n" +
            "\n".join(f"  • {p}" for p in path_summaries)
        )

    return "\n\n" + ("=" * 50) + "\n\n".join(sections)


@router.post("/query")
async def query_knowledge(req: QueryRequest):

    async def stream():
        client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

        # ── TIER 1: Query decomposition ───────────────────
        # For simple queries this returns [query] unchanged.
        # For complex ones: ["Bronze Age collapse", "supply chain theory", ...]
        sub_queries = await decompose_query(req.query)

        # ── TIER 2: Multi-cluster vector search ──────────
        # Search each sub-query separately to cover different graph regions
        all_results: dict[str, float] = {}

        for sub_q in sub_queries:
            results = search(sub_q, top_k=req.top_k)
            for node_id, score in results:
                # Keep highest score if node appears in multiple sub-searches
                if node_id not in all_results or score > all_results[node_id]:
                    all_results[node_id] = score

        # Sort by score
        sorted_results = sorted(
            all_results.items(), key=lambda x: x[1], reverse=True
        )

        if not sorted_results:
            yield f"data: {json.dumps({'type': 'nodes', 'ids': [], 'scores': []})}\n\n"
            yield f"data: {json.dumps({'type': 'text', 'chunk': 'No relevant knowledge found.'})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            return

        seed_ids = [r[0] for r in sorted_results[:req.top_k]]
        scores   = [r[1] for r in sorted_results[:req.top_k]]
        max_score = scores[0] if scores else 0

        # Send highlighted node IDs to frontend immediately
        yield f"data: {json.dumps({'type': 'nodes', 'ids': seed_ids, 'scores': scores})}\n\n"

        # ── TIER 3: Dynamic node generation ──────────────
        # If best match is below threshold, the query touches unknown territory
        new_node = None
        if req.enable_dynamic and max_score < DYNAMIC_THRESHOLD:
            yield f"data: {json.dumps({'type': 'status', 'message': 'Researching unknown territory...'})}\n\n"

            # Determine best domain guess from top result
            top_node = _nodes_by_id.get(seed_ids[0], {})
            domain = top_node.get("domain", "technology")

            new_node = await research_and_generate_node(req.query, domain)

            if new_node:
                # Stream the new node to frontend — it will spawn in 3D
                yield f"data: {json.dumps({'type': 'new_node', 'node': new_node})}\n\n"

        # ── GraphRAG: Subgraph expansion ─────────────────
        subgraph_nodes, subgraph_edges = graph_rag.expand_subgraph(
            seed_ids, depth=2, max_nodes=40
        )

        # ── Path finding: Cross-domain bridges ───────────
        # Find shortest paths between the top nodes from different sub-queries
        path_summaries = []
        if len(sub_queries) > 1:
            # Get top node from each sub-query's results
            per_query_tops = []
            for sub_q in sub_queries:
                results = search(sub_q, top_k=1)
                if results:
                    per_query_tops.append(results[0][0])

            # Find paths between the top nodes
            for i in range(len(per_query_tops)):
                for j in range(i + 1, len(per_query_tops)):
                    path = graph_rag.find_path(
                        per_query_tops[i],
                        per_query_tops[j],
                        max_depth=4,
                    )
                    if path and len(path) > 1:
                        path_titles = [
                            _nodes_by_id.get(pid, {}).get("title", pid)
                            for pid in path
                        ]
                        path_summaries.append(" → ".join(path_titles))

        # ── Build LLM context ────────────────────────────
        context = build_context(
            subgraph_nodes,
            subgraph_edges,
            seed_ids,
            path_summaries,
            graph_rag,
        )

        # Include dynamic node if generated
        if new_node:
            context += (
                f"\n\nDYNAMICALLY RESEARCHED CONCEPT:\n"
                f"[{new_node['domain'].upper()}] {new_node['title']}\n"
                f"{new_node['summary_override']}"
            )

        user_prompt = (
            f'Query: "{req.query}"\n\n'
            f"Sub-queries analyzed: {', '.join(sub_queries)}\n"
            f"{context}\n\n"
            f"Now synthesize a deep analytical response. Use the connection paths "
            f"as the backbone of your cross-domain analysis."
        )

        # ── Stream the synthesis ─────────────────────────
        try:
            stream_response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": user_prompt},
                ],
                max_tokens=1200,
                temperature=0.72,
                top_p=0.9,
                stream=True,
            )

            for chunk in stream_response:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield f"data: {json.dumps({'type': 'text', 'chunk': delta})}\n\n"

        except Exception as e:
            found_titles = [
                _nodes_by_id[nid]["title"]
                for nid in seed_ids if nid in _nodes_by_id
            ]
            fallback = (
                f"Found {len(found_titles)} relevant concepts: "
                f"{', '.join(found_titles[:6])}. "
                f"(Analysis error: {str(e)})"
            )
            yield f"data: {json.dumps({'type': 'text', 'chunk': fallback})}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )