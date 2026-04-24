# app/services/wikipedia.py
"""
On-demand Wikipedia summary fetcher.
Called when a user clicks a node in the frontend —
fetches the full extract and caches it in memory.

Cache persists for the lifetime of the FastAPI process.
In production, swap _cache for Redis.
"""

import os
import httpx
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# Load .env from backend/ root
# __file__ = backend/app/services/wikipedia.py
# .env     = backend/.env  (3 levels up from this file)
load_dotenv(Path(__file__).parent.parent.parent / ".env")

_email  = os.environ.get("WIKI_CONTACT_EMAIL", "contact@example.com")
_github = os.environ.get("WIKI_GITHUB_URL",    "https://github.com/cerebra")
USER_AGENT = f"Cerebra/1.0 ({_github}; {_email})"

# Wikipedia REST API — returns clean JSON with no parsing needed
WIKI_API = "https://en.wikipedia.org/api/rest_v1/page/summary"

# In-memory cache: wikipedia_title → full extract string
# Prevents re-fetching the same article on every panel open
_cache: dict[str, str] = {}


async def fetch_summary(wikipedia_title: str) -> Optional[str]:
    """
    Fetch a plain-text summary for a Wikipedia article title.

    Returns the full 'extract' field from Wikipedia's REST API —
    typically 2–5 paragraphs of clean prose, no markup.

    Returns None if:
      - The article doesn't exist (404)
      - The request fails after retries
      - The extract is empty
    
    Results are cached in memory — repeated calls for the same
    title are instant after the first fetch.
    """
    if not wikipedia_title or not wikipedia_title.strip():
        return None

    # Return cached result immediately
    if wikipedia_title in _cache:
        return _cache[wikipedia_title]

    # Wikipedia REST API expects underscores, not spaces
    slug = wikipedia_title.strip().replace(" ", "_")

    headers = {
        "User-Agent":     USER_AGENT,
        "Api-User-Agent": USER_AGENT,
    }

    async with httpx.AsyncClient(headers=headers) as client:
        for attempt in range(3):
            try:
                response = await client.get(
                    f"{WIKI_API}/{slug}",
                    timeout=8.0,
                    follow_redirects=True,   # some titles redirect (e.g. "DNA" → "DNA")
                )

                if response.status_code == 200:
                    data = response.json()
                    extract = data.get("extract", "").strip()

                    if not extract:
                        return None

                    # Cache the full extract — the frontend can truncate
                    # for tooltips vs the full panel view
                    _cache[wikipedia_title] = extract
                    return extract

                elif response.status_code == 404:
                    # Article genuinely doesn't exist — don't retry
                    return None

                elif response.status_code == 403:
                    # Bot policy violation — should not happen with proper User-Agent
                    # but handle gracefully
                    return None

                elif response.status_code == 429:
                    # Rate limited — wait and retry
                    import asyncio
                    wait = float(response.headers.get("retry-after", 5))
                    await asyncio.sleep(wait)

                else:
                    # Unexpected status — retry
                    import asyncio
                    await asyncio.sleep(1.0)

            except httpx.TimeoutException:
                import asyncio
                await asyncio.sleep(2.0)

            except Exception:
                # Network error, malformed JSON, etc. — fail silently
                return None

    return None


async def fetch_summary_short(wikipedia_title: str, max_sentences: int = 3) -> Optional[str]:
    """
    Convenience wrapper — returns only the first N sentences.
    Useful for tooltips where space is limited.
    Full summary is still cached so the panel can show more.
    """
    full = await fetch_summary(wikipedia_title)
    if not full:
        return None

    sentences = full.split(". ")
    short = ". ".join(sentences[:max_sentences])
    if not short.endswith("."):
        short += "."
    return short


def get_cached_summary(wikipedia_title: str) -> Optional[str]:
    """
    Synchronous cache lookup — no network call.
    Returns cached summary if available, else None.
    Used by the query endpoint to enrich node context
    without additional HTTP calls.
    """
    return _cache.get(wikipedia_title)


def cache_size() -> int:
    """Returns number of cached summaries — useful for health checks."""
    return len(_cache)