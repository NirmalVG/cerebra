"use client"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { useStore } from "@/store/useStore"
import { KnowledgeNode } from "@/lib/types"
import { useIsMobile } from "@/hooks/useIsMobile"

export default function SearchBar() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<KnowledgeNode[]>([])
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const isMobile = useIsMobile()

  const graph = useStore((s) => s.graph)
  const setSelectedNode = useStore((s) => s.setSelectedNode)
  const setHighlightedNodes = useStore((s) => s.setHighlightedNodes)

  const handleSearch = (value: string) => {
    setQuery(value)
    if (!value.trim() || !graph) {
      setResults([])
      setHighlightedNodes([])
      return
    }
    const q = value.toLowerCase()
    const matches = graph.nodes
      .filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.domain.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q)),
      )
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 6)

    setResults(matches)
    setHighlightedNodes(matches.map((n) => n.id))
  }

  const handleSelect = (node: KnowledgeNode) => {
    setSelectedNode(node)
    setHighlightedNodes([node.id])
    setQuery(node.title)
    setResults([])
    setOpen(false)
    inputRef.current?.blur()
  }

  const handleClear = () => {
    setQuery("")
    setResults([])
    setHighlightedNodes([])
    setOpen(false)
  }

  return (
    <div
      style={{
        position: "fixed",
        top: isMobile ? "max(14px, env(safe-area-inset-top))" : "24px",
        left: isMobile ? "12px" : "50%",
        right: isMobile ? "12px" : "auto",
        transform: isMobile ? "none" : "translateX(-50%)",
        zIndex: 80,
        width: isMobile ? "auto" : "380px",
        maxWidth: isMobile ? "none" : "calc(100vw - 48px)",
      }}
    >
      {/* Input */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "rgba(5, 5, 15, 0.88)",
          border: "1px solid rgba(157, 78, 221, 0.35)",
          borderRadius: open && results.length > 0 ? "12px 12px 0 0" : "12px",
          padding: isMobile ? "11px 14px" : "10px 16px",
          backdropFilter: "blur(20px)",
          gap: "10px",
        }}
      >
        {/* Search icon */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9D4EDD"
          strokeWidth="2.5"
          style={{ flexShrink: 0 }}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>

        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            handleSearch(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search knowledge..."
          style={{
            flex: 1,
            minWidth: 0,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#f8f9fa",
            fontSize: isMobile ? "16px" : "13px",
            fontFamily: "inherit",
            // Prevent iOS zoom on focus (font-size must be ≥16px or use this)
            WebkitAppearance: "none",
          }}
        />

        {query && (
          <button
            onClick={handleClear}
            style={{
              background: "none",
              border: "none",
              color: "#666",
              cursor: "pointer",
              fontSize: "16px",
              padding: "0 2px",
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {open && results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: "rgba(5, 5, 15, 0.97)",
            border: "1px solid rgba(157, 78, 221, 0.3)",
            borderTop: "1px solid rgba(157, 78, 221, 0.1)",
            borderRadius: "0 0 12px 12px",
            backdropFilter: "blur(20px)",
            overflow: "hidden",
          }}
        >
          {results.map((node, i) => (
            <button
              key={node.id}
              onClick={() => handleSelect(node)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none",
                padding: isMobile ? "13px 16px" : "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.background =
                  "rgba(157, 78, 221, 0.1)"
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.background =
                  "transparent"
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#9D4EDD",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    color: "#f8f9fa",
                    fontSize: isMobile ? "14px" : "13px",
                    fontWeight: 500,
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {node.title}
                </p>
                <p
                  style={{
                    color: "#666",
                    fontSize: "10px",
                    margin: "2px 0 0",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {node.domain}
                </p>
              </div>
            </button>
          ))}
        </motion.div>
      )}
    </div>
  )
}
