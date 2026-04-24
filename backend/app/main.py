# app/main.py
import os
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.services.wikipedia import fetch_summary
from app.services.embeddings import build_index
from app.routers import query as query_router
import json
from pathlib import Path

SEED_PATH = Path(__file__).parent / "data" / "seed_2000.json"

# Lifespan: runs startup + shutdown logic cleanly
@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP — build embeddings index from seed data
    with open(SEED_PATH, encoding="utf-8") as f:
        graph = json.load(f)
    build_index(graph["nodes"])
    yield
    # SHUTDOWN — nothing to clean up

app = FastAPI(title="Cerebra API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.vercel.app",          # all Vercel preview deployments
        os.environ.get("FRONTEND_URL", ""),   # your custom domain if any
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(query_router.router)

@app.get("/")
async def root():
    return {"status": "Cerebra API is alive"}

@app.get("/graph")
async def get_graph():
    with open(SEED_PATH, encoding="utf-8") as f:
        return json.load(f)

@app.get("/node/{node_id}/summary")
async def get_node_summary(node_id: str):
    with open(SEED_PATH, encoding="utf-8") as f:
        graph = json.load(f)
    node = next((n for n in graph["nodes"] if n["id"] == node_id), None)
    if not node:
        return {"summary": "Node not found."}
    if node.get("summary_override"):
        return {"summary": node["summary_override"]}
    wiki_title = node.get("wikipedia_title", node["title"])
    summary = await fetch_summary(wiki_title)
    return {"summary": summary or "No summary available."}