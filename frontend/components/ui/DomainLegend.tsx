"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { DOMAIN_COLORS } from "@/lib/layout"
import { Domain } from "@/lib/types"
import { useStore } from "@/store/useStore"
import { useIsMobile } from "@/hooks/useIsMobile"

const DOMAIN_LABELS: Record<Domain, string> = {
  physics: "Physics",
  biology: "Biology",
  math: "Mathematics",
  history: "History",
  philosophy: "Philosophy",
  arts: "Arts",
  technology: "Technology",
  cosmos: "Cosmos",
  psychology: "Psychology",
  economics: "Economics",
}

export default function DomainLegend() {
  const [expanded, setExpanded] = useState(false)
  const graph = useStore((s) => s.graph)
  const chatOpen = useStore((s) => s.chatOpen)
  const setHighlightedNodes = useStore((s) => s.setHighlightedNodes)
  const isMobile = useIsMobile()

  if (isMobile && chatOpen) return null
  if (!graph) return null

  const domainCounts = graph.nodes.reduce<Record<string, number>>(
    (acc, node) => {
      acc[node.domain] = (acc[node.domain] || 0) + 1
      return acc
    },
    {},
  )
  const domains = Object.keys(domainCounts) as Domain[]

  const handleDomainClick = (domain: Domain) => {
    const ids = graph.nodes.filter((n) => n.domain === domain).map((n) => n.id)
    setHighlightedNodes(ids)
    if (isMobile) setExpanded(false)
  }

  const handleClear = () => {
    setHighlightedNodes([])
    if (isMobile) setExpanded(false)
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: isMobile
          ? "max(14px, env(safe-area-inset-bottom))"
          : "24px",
        left: isMobile ? "12px" : "24px",
        zIndex: 80,
        maxWidth: isMobile ? "calc(100vw - 24px)" : undefined,
      }}
    >
      {/* Toggle button */}
      <motion.button
        onClick={() => setExpanded((e) => !e)}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        style={{
          background: "rgba(5, 5, 15, 0.85)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "8px",
          padding: isMobile ? "9px 14px" : "7px 12px",
          color: "#888",
          fontSize: isMobile ? "12px" : "11px",
          cursor: "pointer",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          maxWidth: "100%",
          minHeight: isMobile ? "44px" : undefined,
        }}
      >
        {/* Coloured domain dots preview */}
        <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
          {domains.slice(0, 5).map((d) => (
            <div
              key={d}
              style={{
                width: isMobile ? "7px" : "6px",
                height: isMobile ? "7px" : "6px",
                borderRadius: "50%",
                background: DOMAIN_COLORS[d],
              }}
            />
          ))}
        </div>
        Domains
      </motion.button>

      {/* Expanded panel */}
      <AnimatePresence>
        {expanded && (
          <>
            {/* Mobile backdrop */}
            {isMobile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setExpanded(false)}
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: -1,
                  background: "rgba(0,0,0,0.3)",
                }}
              />
            )}

            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                left: 0,
                background: "rgba(5, 5, 15, 0.96)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: "12px",
                padding: "10px",
                backdropFilter: "blur(20px)",
                minWidth: isMobile ? "min(220px, calc(100vw - 24px))" : "180px",
                maxWidth: isMobile ? "calc(100vw - 24px)" : undefined,
                maxHeight: isMobile ? "min(54dvh, 420px)" : undefined,
                overflowY: "auto",
              }}
            >
              {/* Show all */}
              <button
                onClick={handleClear}
                style={{
                  width: "100%",
                  background: "none",
                  border: "none",
                  color: "#555",
                  fontSize: "10px",
                  cursor: "pointer",
                  textAlign: "left",
                  padding: "4px 8px 8px",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Show all
              </button>

              {domains.map((domain) => (
                <motion.button
                  key={domain}
                  onClick={() => handleDomainClick(domain)}
                  whileHover={{ x: 3 }}
                  style={{
                    width: "100%",
                    background: "none",
                    border: "none",
                    padding: isMobile ? "7px 8px" : "5px 6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                    borderRadius: "6px",
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background =
                      `${DOMAIN_COLORS[domain]}15`
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = "none"
                  }}
                >
                  <div
                    style={{
                      width: isMobile ? "10px" : "8px",
                      height: isMobile ? "10px" : "8px",
                      borderRadius: "50%",
                      background: DOMAIN_COLORS[domain],
                      flexShrink: 0,
                      boxShadow: `0 0 6px ${DOMAIN_COLORS[domain]}`,
                    }}
                  />
                  <span
                    style={{
                      color: "#c8ccd4",
                      fontSize: isMobile ? "13px" : "12px",
                      flex: 1,
                      textAlign: "left",
                    }}
                  >
                    {DOMAIN_LABELS[domain]}
                  </span>
                  <span style={{ color: "#444", fontSize: "10px" }}>
                    {domainCounts[domain]}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
