// components/ui/DomainLegend.tsx
"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { DOMAIN_COLORS } from "@/lib/layout"
import { Domain } from "@/lib/types"
import { useStore } from "@/store/useStore"

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
  const setHighlightedNodes = useStore((s) => s.setHighlightedNodes)

  if (!graph) return null

  // Count nodes per domain
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
  }

  const handleClear = () => setHighlightedNodes([])

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        left: "24px",
        zIndex: 80,
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
          padding: "7px 12px",
          color: "#888",
          fontSize: "11px",
          cursor: "pointer",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "3px",
            alignItems: "center",
          }}
        >
          {domains.slice(0, 4).map((d) => (
            <div
              key={d}
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: DOMAIN_COLORS[d],
              }}
            />
          ))}
        </div>
        Domains
      </motion.button>

      {/* Expanded legend */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              bottom: "calc(100% + 8px)",
              left: 0,
              background: "rgba(5, 5, 15, 0.92)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "12px",
              padding: "10px",
              backdropFilter: "blur(20px)",
              minWidth: "180px",
            }}
          >
            {/* Clear filter */}
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
                padding: "4px 6px 8px",
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
                  padding: "5px 6px",
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
                {/* Color dot */}
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: DOMAIN_COLORS[domain],
                    flexShrink: 0,
                    boxShadow: `0 0 6px ${DOMAIN_COLORS[domain]}`,
                  }}
                />
                <span
                  style={{
                    color: "#c8ccd4",
                    fontSize: "12px",
                    flex: 1,
                    textAlign: "left",
                  }}
                >
                  {DOMAIN_LABELS[domain]}
                </span>
                <span
                  style={{
                    color: "#444",
                    fontSize: "10px",
                  }}
                >
                  {domainCounts[domain]}
                </span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
