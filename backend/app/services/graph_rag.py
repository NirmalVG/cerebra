# app/services/graph_rag.py
"""
In-memory GraphRAG.

Given a set of seed node IDs (from FAISS search), expands outward
through the knowledge graph using BFS — finding all directly connected
nodes and the edges between them.

This gives the LLM a subgraph of interconnected concepts rather than
isolated nodes. It's the difference between handing someone a list of
words vs a map showing how those words relate.
"""

from typing import List, Tuple
from collections import deque


class GraphRAG:
    def __init__(self, nodes: list, edges: list):
        self.nodes_by_id = {n["id"]: n for n in nodes}

        # Adjacency list: node_id → list of (neighbor_id, edge_dict)
        self.adjacency: dict[str, list] = {n["id"]: [] for n in nodes}
        self.edges = edges

        for edge in edges:
            src, tgt = edge["source"], edge["target"]
            if src in self.adjacency and tgt in self.adjacency:
                self.adjacency[src].append((tgt, edge))
                self.adjacency[tgt].append((src, edge))  # treat as undirected

    def expand_subgraph(
        self,
        seed_ids: List[str],
        depth: int = 2,
        max_nodes: int = 30,
    ) -> Tuple[List[dict], List[dict]]:
        """
        BFS expansion from seed nodes up to `depth` hops.

        Returns (subgraph_nodes, subgraph_edges) — the local
        neighbourhood of the knowledge graph around the query.

        depth=2 means: seed nodes + their direct neighbours
                       + those neighbours' neighbours.
        At 2000 nodes this is fast — worst case O(n) BFS.
        """
        visited_nodes: set[str] = set(seed_ids)
        visited_edges: set[tuple] = set()
        queue = deque((nid, 0) for nid in seed_ids if nid in self.nodes_by_id)

        while queue and len(visited_nodes) < max_nodes:
            node_id, current_depth = queue.popleft()

            if current_depth >= depth:
                continue

            for neighbor_id, edge in self.adjacency.get(node_id, []):
                if len(visited_nodes) >= max_nodes:
                    break

                # Track the edge (normalise direction for dedup)
                edge_key = (
                    min(edge["source"], edge["target"]),
                    max(edge["source"], edge["target"]),
                )
                visited_edges.add(edge_key)

                if neighbor_id not in visited_nodes:
                    visited_nodes.add(neighbor_id)
                    queue.append((neighbor_id, current_depth + 1))

        subgraph_nodes = [
            self.nodes_by_id[nid]
            for nid in visited_nodes
            if nid in self.nodes_by_id
        ]

        subgraph_edges = [
            e for e in self.edges
            if (min(e["source"], e["target"]),
                max(e["source"], e["target"])) in visited_edges
        ]

        return subgraph_nodes, subgraph_edges

    def find_path(
        self,
        start_id: str,
        end_id: str,
        max_depth: int = 4,
    ) -> List[str]:
        """
        BFS shortest path between two nodes.
        Used to find conceptual bridges between distant ideas.
        e.g. "Bronze Age collapse" → "supply chain theory"
        """
        if start_id not in self.nodes_by_id or end_id not in self.nodes_by_id:
            return []

        visited = {start_id}
        queue = deque([[start_id]])

        while queue:
            path = queue.popleft()
            node_id = path[-1]

            if node_id == end_id:
                return path

            if len(path) > max_depth:
                continue

            for neighbor_id, _ in self.adjacency.get(node_id, []):
                if neighbor_id not in visited:
                    visited.add(neighbor_id)
                    queue.append(path + [neighbor_id])

        return []

    def get_connections_summary(
        self,
        subgraph_nodes: List[dict],
        subgraph_edges: List[dict],
    ) -> str:
        """
        Render the subgraph as a human-readable connection map
        for inclusion in the LLM prompt.
        """
        node_titles = {n["id"]: n["title"] for n in subgraph_nodes}
        lines = []

        for edge in subgraph_edges:
            src_title = node_titles.get(edge["source"], edge["source"])
            tgt_title = node_titles.get(edge["target"], edge["target"])
            relation  = edge.get("relation", "related-to")
            strength  = edge.get("strength", 0.5)
            if strength >= 0.6:   # only show strong connections
                lines.append(f"  • {src_title} —[{relation}]→ {tgt_title}")

        return "\n".join(lines) if lines else "  (no strong direct connections)"