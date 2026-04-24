# app/services/research_agent.py
"""
Two responsibilities:

1. AGENTIC QUERY DECOMPOSITION
   Complex queries get broken into sub-questions, each searched
   separately, then synthesized into one deep answer.
   e.g. "How did Bronze Age collapse influence supply chain theory?"
   → Search: ["Bronze Age collapse", "supply chain resilience",
              "civilizational collapse patterns"]

2. DYNAMIC NODE GENERATION
   When FAISS confidence is low (query touches unknown territory),
   Tavily researches the topic, the LLM synthesizes a node,
   and it gets streamed back to the frontend as a new glowing node.
"""

import os
import json
import asyncio
from typing import Optional
from groq import Groq


def get_groq_client() -> Groq:
    return Groq(api_key=os.environ.get("GROQ_API_KEY"))


async def decompose_query(query: str) -> list[str]:
    """
    Use LLM to break a complex query into 2-3 focused sub-queries.
    Each sub-query maps to a different region of the knowledge graph.

    Returns a list of sub-queries, or [query] if decomposition isn't needed.
    """
    client = get_groq_client()

    prompt = f"""Analyze this knowledge query and decompose it into 2-3 focused sub-queries 
that each target a specific domain of knowledge. If the query is already focused, 
return just the original query.

Query: "{query}"

Respond with ONLY a JSON array of strings. No explanation. Example:
["sub-query 1", "sub-query 2", "sub-query 3"]"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=0.3,
        )
        text = response.choices[0].message.content.strip()

        # Strip markdown code fences if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()

        sub_queries = json.loads(text)
        if isinstance(sub_queries, list) and all(isinstance(q, str) for q in sub_queries):
            return sub_queries[:3]   # max 3

    except Exception:
        pass

    return [query]   # fallback: treat as single query


async def research_and_generate_node(
    query: str,
    domain: str = "technology",
) -> Optional[dict]:
    """
    When the knowledge graph doesn't contain what the user needs,
    this function:
    1. Searches the web via Tavily
    2. Synthesizes a new node from the research
    3. Returns node data to be spawned in the 3D brain

    Returns a node dict or None if research fails.
    """
    # Try Tavily first
    tavily_context = ""
    try:
        from tavily import TavilyClient
        tavily = TavilyClient(api_key=os.environ.get("TAVILY_API_KEY"))
        results = tavily.search(
            query=query,
            search_depth="advanced",
            max_results=3,
        )
        # Combine top result excerpts
        excerpts = [r.get("content", "")[:400] for r in results.get("results", [])]
        tavily_context = "\n\n".join(excerpts)
    except Exception:
        tavily_context = ""

    if not tavily_context:
        return None

    # Use LLM to synthesize a knowledge node from the research
    client = get_groq_client()

    prompt = f"""Based on this research about "{query}", create a knowledge node 
in the Cerebra knowledge graph.

Research:
{tavily_context}

Create a JSON object with these exact fields:
{{
  "title": "concept name (2-5 words)",
  "domain": "{domain}",  
  "tags": ["tag1", "tag2", "tag3"],
  "importance": 0.75,
  "summary_override": "2-3 sentence summary in Cerebra voice: insightful, concise, slightly poetic. Focus on the concept's essence and significance.",
  "is_dynamic": true
}}

Respond with ONLY the JSON object."""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0.5,
        )
        text = response.choices[0].message.content.strip()

        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()

        node_data = json.loads(text)

        # Validate required fields
        required = ["title", "domain", "tags", "importance", "summary_override"]
        if all(k in node_data for k in required):
            import re, unicodedata

            def slugify(s: str) -> str:
                s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
                s = s.lower()
                s = re.sub(r"[''`\"]+", "", s)
                s = re.sub(r"[^a-z0-9]+", "-", s)
                return s.strip("-")

            node_data["id"] = "dynamic-" + slugify(node_data["title"])
            node_data["is_dynamic"] = True
            return node_data

    except Exception:
        pass

    return None