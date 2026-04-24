// components/ui/StatsBar.tsx
"use client"

import { useStore } from "@/store/useStore"

export default function StatsBar() {
  const graph = useStore((s) => s.graph)
  const highlightedNodes = useStore((s) => s.highlightedNodes)

  if (!graph) return null

  const nodeCount = graph.nodes.length
  const edgeCount = graph.edges.length
  const activeCount = highlightedNodes.size

  return (
    <div
      style={{
        position: "fixed",
        top: "24px",
        left: "24px",
        zIndex: 80,
        display: "flex",
        gap: "16px",
        alignItems: "center",
      }}
    >
      <div
        style={{
          background: "rgba(5, 5, 15, 0.75)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "8px",
          padding: "6px 12px",
          backdropFilter: "blur(12px)",
          display: "flex",
          gap: "14px",
          alignItems: "center",
        }}
      >
        <Stat
          label="nodes"
          value={activeCount > 0 ? `${activeCount}/${nodeCount}` : nodeCount}
        />
        <div
          style={{
            width: "1px",
            height: "14px",
            background: "rgba(255,255,255,0.08)",
          }}
        />
        <Stat label="edges" value={edgeCount} />
        <div
          style={{
            width: "1px",
            height: "14px",
            background: "rgba(255,255,255,0.08)",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: "#22c55e",
              boxShadow: "0 0 6px #22c55e",
            }}
          />
          <span
            style={{ color: "#444", fontSize: "10px", letterSpacing: "0.06em" }}
          >
            LIVE
          </span>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
      <span style={{ color: "#f8f9fa", fontSize: "13px", fontWeight: 600 }}>
        {value}
      </span>
      <span
        style={{
          color: "#444",
          fontSize: "10px",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </div>
  )
}
