"use client"

import { useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useStore } from "@/store/useStore"
import { DOMAIN_COLORS } from "@/lib/layout"

export default function Tooltip() {
  const hoveredNode = useStore((s) => s.hoveredNode)
  const ref = useRef<HTMLDivElement>(null)

  // Follow mouse position
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!ref.current) return
      ref.current.style.left = `${e.clientX + 16}px`
      ref.current.style.top = `${e.clientY - 12}px`
    }
    window.addEventListener("mousemove", onMouseMove)
    return () => window.removeEventListener("mousemove", onMouseMove)
  }, [])

  const color = hoveredNode ? DOMAIN_COLORS[hoveredNode.domain] : "#ffffff"

  return (
    <AnimatePresence>
      {hoveredNode && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.92, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 4 }}
          transition={{ duration: 0.12 }}
          style={{
            position: "fixed",
            pointerEvents: "none",
            zIndex: 100,
            background: "rgba(5, 5, 10, 0.85)",
            border: `1px solid ${color}44`,
            borderRadius: "8px",
            padding: "8px 12px",
            backdropFilter: "blur(12px)",
            maxWidth: "220px",
          }}
        >
          {/* Domain color bar */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "3px",
              borderRadius: "8px 0 0 8px",
              background: color,
            }}
          />

          <p
            style={{
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 600,
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {hoveredNode.title}
          </p>

          <p
            style={{
              color: color,
              fontSize: "10px",
              fontWeight: 500,
              margin: "3px 0 0 0",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {hoveredNode.domain}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
