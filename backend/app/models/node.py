# app/models/node.py
from pydantic import BaseModel
from typing import Optional, List, Literal

Domain = Literal[
    'physics', 'biology', 'math', 'history', 
    'philosophy', 'arts', 'technology', 'cosmos', 
    'psychology', 'economics'
]

RelationType = Literal['is-a', 'part-of', 'related-to', 'causes', 'preceded-by', 'created-by']

class KnowledgeNode(BaseModel):
    id: str
    title: str
    domain: Domain
    tags: List[str]
    summary: str = ""           # empty until fetched/generated
    importance: float = 0.5     # 0–1
    year: Optional[int] = None
    wikipedia_title: Optional[str] = None
    summary_override: Optional[str] = None  # if set, skip Wikipedia

class KnowledgeEdge(BaseModel):
    source: str
    target: str
    relation: RelationType
    strength: float = 0.5

class KnowledgeGraph(BaseModel):
    nodes: List[KnowledgeNode]
    edges: List[KnowledgeEdge]

class QueryRequest(BaseModel):
    query: str
    top_k: int = 10

class QueryResponse(BaseModel):
    node_ids: List[str]
    explanation: str
    path: List[str]