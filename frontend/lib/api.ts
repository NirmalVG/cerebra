// lib/api.ts — API client functions

import { KnowledgeGraph } from "./types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function fetchGraph(): Promise<KnowledgeGraph> {
  const response = await fetch(`${API_URL}/graph`)
  if (!response.ok)
    throw new Error(`Failed to fetch graph: ${response.statusText}`)
  return response.json()
}

export async function fetchNodeSummary(nodeId: string): Promise<string> {
  const response = await fetch(`${API_URL}/node/${nodeId}/summary`)
  if (!response.ok)
    throw new Error(`Failed to fetch node summary: ${response.statusText}`)
  const data = await response.json()
  return data.summary || ""
}

export async function streamQuery(
  query: string,
  onNodes: (ids: string[], scores: number[]) => void,
  onChunk: (chunk: string) => void,
  onStatus: (message: string) => void,
  onNewNode: (node: any) => void,
  onDone: () => void,
): Promise<void> {
  const response = await fetch(`${API_URL}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, top_k: 10, enable_dynamic: true }),
  })

  if (!response.body) return

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || "" // keep incomplete line in buffer

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue
      try {
        const msg = JSON.parse(line.slice(6))
        if (msg.type === "nodes") onNodes(msg.ids, msg.scores)
        else if (msg.type === "text") onChunk(msg.chunk)
        else if (msg.type === "status") onStatus(msg.message)
        else if (msg.type === "new_node") onNewNode(msg.node)
        else if (msg.type === "done") onDone()
      } catch {
        // incomplete JSON chunk
      }
    }
  }
}
