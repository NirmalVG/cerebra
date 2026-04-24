// lib/types.ts

export type Domain =
  | "physics"
  | "biology"
  | "math"
  | "history"
  | "philosophy"
  | "arts"
  | "technology"
  | "cosmos"
  | "psychology"
  | "economics"

export interface KnowledgeNode {
  id: string
  title: string
  domain: Domain
  tags: string[]
  summary: string // populated by backend (Wikipedia or override)
  importance: number // 0–1, controls node size
  position?: [number, number, number] // assigned by frontend layout engine
  year?: number // for historical nodes (e.g., 1687 for Newton's Principia)
  wikipedia_title?: string
}

export interface KnowledgeEdge {
  source: string // node id
  target: string // node id
  relation:
    | "is-a"
    | "part-of"
    | "related-to"
    | "causes"
    | "preceded-by"
    | "created-by"
  strength: number // 0–1, controls edge opacity/thickness
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
}

export interface QueryResult {
  nodes: KnowledgeNode[]
  explanation: string // streaming text from backend
  path: string[] // node ids in order (for camera animation)
}
