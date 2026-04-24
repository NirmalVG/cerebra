// lib/api.ts — update streamQuery
export async function streamQuery(
  query: string,
  onNodes: (ids: string[], scores: number[]) => void,
  onChunk: (chunk: string) => void,
  onStatus: (message: string) => void,
  onNewNode: (node: any) => void,
  onDone: () => void,
): Promise<void> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

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
