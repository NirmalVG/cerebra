"use client"

import { useStore } from "@/store/useStore"
import { useIsMobile } from "@/hooks/useIsMobile"

export default function StatsBar() {
  const graph = useStore((s) => s.graph)
  const highlightedNodes = useStore((s) => s.highlightedNodes)
  const isMobile = useIsMobile()

  if (!graph) return null

  const nodeCount = graph.nodes.length
  const edgeCount = graph.edges.length
  const activeCount = highlightedNodes.size

  // On mobile, stack below search so bottom controls stay clear.
  return (
    <div
      style={{
        position: "fixed",
        top: isMobile
          ? "calc(max(14px, env(safe-area-inset-top)) + 58px)"
          : "24px",
        left: isMobile ? "12px" : "24px",
        right: isMobile ? "12px" : undefined,
        zIndex: 80,
      }}
    >
      <div
        style={{
          background: "rgba(5, 5, 15, 0.80)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "8px",
          padding: isMobile ? "5px 10px" : "6px 12px",
          backdropFilter: "blur(12px)",
          display: "flex",
          gap: isMobile ? "10px" : "14px",
          alignItems: "center",
          justifyContent: isMobile ? "center" : "flex-start",
          width: isMobile ? "100%" : "auto",
        }}
      >
        <Stat
          label="nodes"
          value={activeCount > 0 ? `${activeCount}/${nodeCount}` : nodeCount}
          mobile={isMobile}
        />
        <Divider />
        <Stat label="edges" value={edgeCount} mobile={isMobile} />
        <Divider />
        {/* Live indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: "#22c55e",
              boxShadow: "0 0 6px #22c55e",
            }}
          />
          {!isMobile && (
            <span
              style={{
                color: "#444",
                fontSize: "10px",
                letterSpacing: "0.06em",
              }}
            >
              LIVE
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  mobile,
}: {
  label: string
  value: number | string
  mobile: boolean
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
      <span
        style={{
          color: "#f8f9fa",
          fontSize: mobile ? "11px" : "13px",
          fontWeight: 600,
        }}
      >
        {typeof value === "number" ? value.toLocaleString("en-US") : value}
      </span>
      <span
        style={{
          color: "#444",
          fontSize: "9px",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </div>
  )
}

function Divider() {
  return (
    <div
      style={{
        width: "1px",
        height: "12px",
        background: "rgba(255,255,255,0.07)",
      }}
    />
  )
}
