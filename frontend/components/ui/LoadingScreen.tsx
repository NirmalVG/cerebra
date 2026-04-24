// components/ui/LoadingScreen.tsx
"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useStore } from "@/store/useStore"
import { useEffect, useState } from "react"

const LOADING_PHRASES = [
  "Mapping the cosmos of knowledge...",
  "Connecting ideas across time...",
  "Expanding the neural fabric...",
  "Awakening Cerebra...",
]

export default function LoadingScreen() {
  const graph = useStore((s) => s.graph)
  const [phrase, setPhrase] = useState(LOADING_PHRASES[0])
  const [visible, setVisible] = useState(true)

  // Cycle through phrases while loading
  useEffect(() => {
    if (graph) return
    let i = 0
    const interval = setInterval(() => {
      i = (i + 1) % LOADING_PHRASES.length
      setPhrase(LOADING_PHRASES[i])
    }, 1800)
    return () => clearInterval(interval)
  }, [graph])

  // Fade out once graph is loaded — slight delay for dramatic effect
  useEffect(() => {
    if (graph) {
      const timeout = setTimeout(() => setVisible(false), 600)
      return () => clearTimeout(timeout)
    }
  }, [graph])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "#050508",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "32px",
          }}
        >
          {/* Pulsing orb */}
          <div style={{ position: "relative", width: "80px", height: "80px" }}>
            {/* Outer ring */}
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "1px solid #9D4EDD",
              }}
            />
            {/* Inner orb */}
            <motion.div
              animate={{ scale: [0.95, 1.05, 0.95] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute",
                inset: "12px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, #9D4EDD 0%, #4CC9F0 60%, transparent 100%)",
                filter: "blur(4px)",
              }}
            />
            {/* Core */}
            <div
              style={{
                position: "absolute",
                inset: "28px",
                borderRadius: "50%",
                background: "#ffffff",
                filter: "blur(2px)",
              }}
            />
          </div>

          {/* Title */}
          <div style={{ textAlign: "center" }}>
            <motion.h1
              style={{
                color: "#f8f9fa",
                fontSize: "28px",
                fontWeight: 700,
                margin: "0 0 8px",
                letterSpacing: "-0.02em",
              }}
            >
              Cerebra
            </motion.h1>

            <AnimatePresence mode="wait">
              <motion.p
                key={phrase}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.4 }}
                style={{
                  color: "#555",
                  fontSize: "13px",
                  margin: 0,
                  letterSpacing: "0.02em",
                }}
              >
                {phrase}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Progress dots */}
          <div style={{ display: "flex", gap: "6px" }}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  background: "#9D4EDD",
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
