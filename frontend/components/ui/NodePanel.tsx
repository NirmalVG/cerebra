"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useStore } from "@/store/useStore"
import { DOMAIN_COLORS } from "@/lib/layout"
import { fetchNodeSummary } from "@/lib/api"
import { useIsMobile } from "@/hooks/useIsMobile"

export default function NodePanel() {
  const selectedNode = useStore((s) => s.selectedNode)
  const setSelectedNode = useStore((s) => s.setSelectedNode)
  const [summaryResult, setSummaryResult] = useState<{
    nodeId: string
    summary: string
  } | null>(null)
  const isMobile = useIsMobile()
  const selectedNodeId = selectedNode?.id

  useEffect(() => {
    if (!selectedNodeId) return
    let cancelled = false

    fetchNodeSummary(selectedNodeId)
      .then((summary) => {
        if (!cancelled) setSummaryResult({ nodeId: selectedNodeId, summary })
      })
      .catch(() => {
        if (!cancelled) {
          setSummaryResult({
            nodeId: selectedNodeId,
            summary: "Summary unavailable.",
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [selectedNodeId])

  const color = selectedNode
    ? (DOMAIN_COLORS[selectedNode.domain] ?? "#ffffff")
    : "#ffffff"
  const summary =
    selectedNodeId && summaryResult?.nodeId === selectedNodeId
      ? summaryResult.summary
      : ""
  const loading = Boolean(
    selectedNodeId && summaryResult?.nodeId !== selectedNodeId,
  )

  // ── Desktop: slide in from left, vertically centred
  const desktopStyles = {
    position: "fixed" as const,
    top: "50%",
    left: "24px",
    transform: "translateY(-50%)",
    zIndex: 60,
    width: "340px",
    maxHeight: "70vh",
  }

  // ── Mobile: centered modal
  const mobileStyles = {
    position: "fixed" as const,
    top: "50%",
    left: "50%",
    zIndex: 90,
    width: "calc(100vw - 32px)",
    maxWidth: "390px",
    maxHeight: "min(74dvh, 620px)",
  }

  const panelStyles = isMobile ? mobileStyles : desktopStyles

  const initial = isMobile
    ? { x: "-50%", y: "-46%", opacity: 0, scale: 0.96 }
    : { x: -40, opacity: 0 }
  const animate = isMobile
    ? { x: "-50%", y: "-50%", opacity: 1, scale: 1 }
    : { x: 0, opacity: 1 }
  const exit = isMobile
    ? { x: "-50%", y: "-46%", opacity: 0, scale: 0.96 }
    : { x: -40, opacity: 0 }

  return (
    <AnimatePresence>
      {selectedNode && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedNode(null)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: isMobile ? 85 : 50,
              background: isMobile ? "rgba(0,0,0,0.4)" : "transparent",
            }}
          />

          {/* Panel */}
          <motion.div
            initial={initial}
            animate={animate}
            exit={exit}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{
              ...panelStyles,
              background: "rgba(5, 5, 15, 0.96)",
              border: `1px solid ${color}33`,
              borderRadius: "16px",
              backdropFilter: "blur(20px)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Color accent bar */}
            <div
              style={{
                height: "3px",
                background: `linear-gradient(90deg, ${color}, transparent)`,
                flexShrink: 0,
              }}
            />

            {/* Header */}
            <div
              style={{
                padding: isMobile ? "14px 20px 12px" : "20px 20px 16px",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      color: color,
                      fontSize: "10px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      margin: "0 0 6px 0",
                    }}
                  >
                    {selectedNode.domain}
                  </p>
                  <h2
                    style={{
                      color: "#f8f9fa",
                      fontSize: isMobile ? "18px" : "20px",
                      fontWeight: 700,
                      margin: 0,
                      lineHeight: 1.25,
                      wordBreak: "break-word",
                    }}
                  >
                    {selectedNode.title}
                  </h2>
                </div>

                {/* Close */}
                <button
                  onClick={() => setSelectedNode(null)}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "none",
                    color: "#888",
                    width: isMobile ? "32px" : "28px",
                    height: isMobile ? "32px" : "28px",
                    borderRadius: "50%",
                    cursor: "pointer",
                    fontSize: "14px",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Tags */}
              {selectedNode.tags.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                    marginTop: "12px",
                  }}
                >
                  {selectedNode.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        background: `${color}18`,
                        border: `1px solid ${color}33`,
                        color: color,
                        fontSize: "10px",
                        padding: "3px 9px",
                        borderRadius: "99px",
                        fontWeight: 500,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {selectedNode.year && (
                <p
                  style={{
                    color: "#555",
                    fontSize: "11px",
                    margin: "10px 0 0",
                  }}
                >
                  circa {selectedNode.year}
                </p>
              )}
            </div>

            {/* Divider */}
            <div
              style={{
                height: "1px",
                background: `${color}22`,
                margin: "0 20px",
                flexShrink: 0,
              }}
            />

            {/* Summary */}
            <div
              style={{
                padding: "16px 20px 20px",
                overflowY: "auto",
                flex: 1,
                WebkitOverflowScrolling: "touch",
              }}
            >
              {loading ? (
                <LoadingPulse color={color} />
              ) : (
                <p
                  style={{
                    color: "#c8ccd4",
                    fontSize: isMobile ? "14px" : "13px",
                    lineHeight: 1.75,
                    margin: 0,
                  }}
                >
                  {summary || "No summary available."}
                </p>
              )}
            </div>

            {/* Importance bar */}
            <div
              style={{
                padding: isMobile ? "10px 20px 20px" : "12px 20px 16px",
                paddingBottom: isMobile
                  ? "max(20px, env(safe-area-inset-bottom))"
                  : "16px",
                borderTop: `1px solid ${color}15`,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                }}
              >
                <span style={{ color: "#555", fontSize: "10px" }}>
                  IMPORTANCE
                </span>
                <span
                  style={{ color: color, fontSize: "10px", fontWeight: 600 }}
                >
                  {Math.round(selectedNode.importance * 100)}%
                </span>
              </div>
              <div
                style={{
                  height: "3px",
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: "99px",
                  overflow: "hidden",
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${selectedNode.importance * 100}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  style={{
                    height: "100%",
                    background: color,
                    borderRadius: "99px",
                  }}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function LoadingPulse({ color }: { color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {[100, 85, 90, 60].map((w, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
          style={{
            height: "12px",
            width: `${w}%`,
            background: `${color}33`,
            borderRadius: "4px",
          }}
        />
      ))}
    </div>
  )
}
