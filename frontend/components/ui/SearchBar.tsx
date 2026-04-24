"use client"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { useStore } from "@/store/useStore"
import { KnowledgeNode } from "@/lib/types"

export default function SearchBar() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<KnowledgeNode[]>([])
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const graph = useStore((s) => s.graph)
  const setSelectedNode = useStore((s) => s.setSelectedNode)
  const setHighlightedNodes = useStore((s) => s.setHighlightedNodes)
  const setCameraTarget = useStore((s) => s.setCameraTarget)

  const handleSearch = (value: string) => {
    setQuery(value)
    if (!value.trim() || !graph) {
      setResults([])
      setHighlightedNodes([])
      return
    }

    const q = value.toLowerCase()

    // Simple client-side search across title + tags + domain
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
        top: "24px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 80,
        width: "380px",
        maxWidth: "calc(100vw - 48px)",
      }}
    >
      {/* Input */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "rgba(5, 5, 15, 0.85)",
          border: "1px solid rgba(157, 78, 221, 0.3)",
          borderRadius: open && results.length > 0 ? "12px 12px 0 0" : "12px",
          padding: "10px 16px",
          backdropFilter: "blur(20px)",
          gap: "10px",
          transition: "border-color 0.2s",
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
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#f8f9fa",
            fontSize: "13px",
            fontFamily: "inherit",
          }}
        />

        {query && (
          <button
            onClick={handleClear}
            style={{
              background: "none",
              border: "none",
              color: "#555",
              cursor: "pointer",
              fontSize: "14px",
              padding: 0,
              lineHeight: 1,
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
            background: "rgba(5, 5, 15, 0.95)",
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
                padding: "10px 16px",
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
              {/* Domain dot */}
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#9D4EDD",
                  flexShrink: 0,
                }}
              />
              <div>
                <p
                  style={{
                    color: "#f8f9fa",
                    fontSize: "13px",
                    fontWeight: 500,
                    margin: 0,
                  }}
                >
                  {node.title}
                </p>
                <p
                  style={{
                    color: "#666",
                    fontSize: "10px",
                    margin: "1px 0 0 0",
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
