"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useStore } from "@/store/useStore"
import { DOMAIN_COLORS } from "@/lib/layout"
import { fetchNodeSummary } from "@/lib/api"

export default function NodePanel() {
  const selectedNode = useStore((s) => s.selectedNode)
  const setSelectedNode = useStore((s) => s.setSelectedNode)
  const [summary, setSummary] = useState<string>("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedNode) {
      setSummary("")
      return
    }

    setLoading(true)
    setSummary("")

    fetchNodeSummary(selectedNode.id)
      .then(setSummary)
      .catch(() => setSummary("Summary unavailable."))
      .finally(() => setLoading(false))
  }, [selectedNode?.id])

  const color = selectedNode ? DOMAIN_COLORS[selectedNode.domain] : "#ffffff"

  return (
    <AnimatePresence>
      {selectedNode && (
        <>
          {/* Backdrop — click to close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedNode(null)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              background: "transparent",
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{
              position: "fixed",
              top: "50%",
              right: "24px",
              transform: "translateY(-50%)",
              zIndex: 60,
              width: "340px",
              maxHeight: "70vh",
              background: "rgba(5, 5, 15, 0.92)",
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
            <div style={{ padding: "20px 20px 16px", flexShrink: 0 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <div>
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
                      fontSize: "20px",
                      fontWeight: 700,
                      margin: 0,
                      lineHeight: 1.25,
                    }}
                  >
                    {selectedNode.title}
                  </h2>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setSelectedNode(null)}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "none",
                    color: "#888",
                    width: "28px",
                    height: "28px",
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
                        padding: "2px 8px",
                        borderRadius: "99px",
                        fontWeight: 500,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Year if present */}
              {selectedNode.year && (
                <p
                  style={{
                    color: "#666",
                    fontSize: "11px",
                    margin: "10px 0 0 0",
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
              }}
            >
              {loading ? (
                <LoadingPulse color={color} />
              ) : (
                <p
                  style={{
                    color: "#c8ccd4",
                    fontSize: "13px",
                    lineHeight: 1.7,
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
                padding: "12px 20px 16px",
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

// Animated loading skeleton
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
