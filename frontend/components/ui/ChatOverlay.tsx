"use client"

import { useState, useRef, useEffect, useSyncExternalStore } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useStore } from "@/store/useStore"
import { streamQuery } from "@/lib/api"
import { useIsMobile } from "@/hooks/useIsMobile"

interface Message {
  id: string
  role: "user" | "assistant"
  text: string
  nodeIds?: string[]
  streaming?: boolean
  isStatus?: boolean
  isDiscovery?: boolean
}

export default function ChatOverlay() {
  const chatOpen = useStore((s) => s.chatOpen)
  const toggleChat = useStore((s) => s.toggleChat)
  const setHighlightedNodes = useStore((s) => s.setHighlightedNodes)
  const setSelectedNode = useStore((s) => s.setSelectedNode)
  const addDynamicNode = useStore((s) => s.addDynamicNode)
  const graph = useStore((s) => s.graph)
  const isMobile = useIsMobile()

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "I am Cerebra. Ask me anything across science, history, philosophy, or art. I'll find the connections others miss.",
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (chatOpen) setTimeout(() => inputRef.current?.focus(), 300)
  }, [chatOpen])

  const runQuery = async (userText: string) => {
    if (!userText.trim() || loading) return
    setLoading(true)

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "user",
        text: userText,
      },
    ])

    const assistantId = (Date.now() + 1).toString()
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: "assistant",
        text: "",
        streaming: true,
      },
    ])

    try {
      await streamQuery(
        userText,
        (ids) => {
          setHighlightedNodes(ids)
          if (ids.length > 0 && graph) {
            const topNode = graph.nodes.find((n) => n.id === ids[0])
            if (topNode) setSelectedNode(topNode)
          }
        },
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, text: m.text + chunk, isStatus: false }
                : m,
            ),
          )
        },
        (message) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, text: message, isStatus: true }
                : m,
            ),
          )
        },
        (node) => {
          addDynamicNode(node)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    text: `✦ New concept discovered: ${node.title}\n\n`,
                    isDiscovery: true,
                  }
                : m,
            ),
          )
        },
        () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, streaming: false, isStatus: false }
                : m,
            ),
          )
          setLoading(false)
        },
      )
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                text: "Connection error — is the backend running?",
                streaming: false,
              }
            : m,
        ),
      )
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!input.trim() || loading) return
    const t = input.trim()
    setInput("")
    await runQuery(t)
  }

  const handleVoiceTranscript = async (text: string) => {
    setInput(text)
    await new Promise((r) => setTimeout(r, 400))
    setInput("")
    await runQuery(text)
  }

  // Panel dimensions
  const panelWidth = isMobile ? "100%" : "420px"
  const panelHeight = isMobile ? "min(82dvh, 680px)" : "580px"
  const panelRight = isMobile ? "0" : "24px"
  const panelBottom = isMobile ? "0" : "76px"
  const panelRadius = isMobile ? "20px 20px 0 0" : "16px"

  const panelInitial = isMobile
    ? { y: "100%", opacity: 1 }
    : { y: 20, opacity: 0, scale: 0.97 }
  const panelAnimate = isMobile
    ? { y: 0, opacity: 1 }
    : { y: 0, opacity: 1, scale: 1 }
  const panelExit = isMobile
    ? { y: "100%", opacity: 1 }
    : { y: 20, opacity: 0, scale: 0.97 }

  return (
    <>
      {/* ── Toggle button ───────────────────────── */}
      {!(isMobile && chatOpen) && (
        <motion.button
          onClick={toggleChat}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            position: "fixed",
            bottom: isMobile
              ? "max(14px, env(safe-area-inset-bottom))"
              : "24px",
            right: isMobile ? "12px" : "24px",
            zIndex: 80,
            background: chatOpen
              ? "rgba(157, 78, 221, 0.3)"
              : "rgba(157, 78, 221, 0.15)",
            border: "1px solid rgba(157, 78, 221, 0.5)",
            borderRadius: "50px",
            padding: isMobile ? "12px 20px" : "10px 18px",
            color: "#c084fc",
            fontSize: isMobile ? "14px" : "13px",
            fontWeight: 600,
            cursor: "pointer",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            letterSpacing: "0.02em",
            minHeight: isMobile ? "44px" : undefined,
            maxWidth: isMobile ? "calc(100vw - 156px)" : undefined,
            whiteSpace: "nowrap",
          }}
        >
          <BrainIcon />
          {chatOpen ? "Close" : "Ask Cerebra"}
        </motion.button>
      )}

      {/* ── Chat panel ──────────────────────────── */}
      <AnimatePresence>
        {chatOpen && (
          <>
            {/* Mobile full-screen backdrop */}
            {isMobile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={toggleChat}
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 69,
                  background: "rgba(0,0,0,0.5)",
                }}
              />
            )}

            <motion.div
              initial={panelInitial}
              animate={panelAnimate}
              exit={panelExit}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{
                position: "fixed",
                bottom: panelBottom,
                right: panelRight,
                zIndex: 70,
                width: panelWidth,
                height: panelHeight,
                maxWidth: "100vw",
                background: "rgba(5, 5, 15, 0.96)",
                border: "1px solid rgba(157, 78, 221, 0.25)",
                borderRadius: panelRadius,
                backdropFilter: "blur(20px)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Mobile drag handle */}
              {isMobile && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: "12px 0 4px",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "4px",
                      borderRadius: "99px",
                      background: "rgba(255,255,255,0.15)",
                    }}
                  />
                </div>
              )}

              {/* Header */}
              <div
                style={{
                  padding: isMobile ? "10px 16px" : "14px 16px",
                  borderBottom: "1px solid rgba(157, 78, 221, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <motion.div
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#9D4EDD",
                      boxShadow: "0 0 8px #9D4EDD",
                    }}
                  />
                  <span
                    style={{
                      color: "#c084fc",
                      fontSize: "12px",
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    Cerebra
                  </span>
                </div>
                <button
                  onClick={
                    isMobile
                      ? toggleChat
                      : () =>
                          setMessages([
                            {
                              id: "welcome",
                              role: "assistant",
                              text: "I am Cerebra. Ask me anything across science, history, philosophy, or art. I'll find the connections others miss.",
                            },
                          ])
                  }
                  style={{
                    background: "none",
                    border: "none",
                    color: "#444",
                    fontSize: "11px",
                    cursor: "pointer",
                    letterSpacing: "0.04em",
                    padding: "4px 6px",
                  }}
                >
                  {isMobile ? "close" : "clear"}
                </button>
              </div>

              {/* Messages */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isMobile={isMobile}
                  />
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input row */}
              <div
                style={{
                  padding: isMobile ? "12px 12px 20px" : "12px",
                  borderTop: "1px solid rgba(157, 78, 221, 0.15)",
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                  flexShrink: 0,
                  // Extra bottom padding on mobile for home bar
                  paddingBottom: isMobile
                    ? "max(20px, env(safe-area-inset-bottom))"
                    : "12px",
                }}
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleSubmit()
                  }
                  placeholder="Ask anything..."
                  disabled={loading}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(157, 78, 221, 0.25)",
                    borderRadius: "8px",
                    padding: isMobile ? "12px 14px" : "9px 12px",
                    color: "#f8f9fa",
                    fontSize: isMobile ? "16px" : "12px", // ≥16px prevents iOS zoom
                    outline: "none",
                    fontFamily: "inherit",
                    opacity: loading ? 0.5 : 1,
                    WebkitAppearance: "none",
                  }}
                />
                <VoiceButton
                  onTranscript={handleVoiceTranscript}
                  disabled={loading}
                />
                <motion.button
                  onClick={handleSubmit}
                  whileTap={{ scale: 0.92 }}
                  disabled={loading || !input.trim()}
                  style={{
                    background:
                      loading || !input.trim()
                        ? "rgba(157, 78, 221, 0.12)"
                        : "rgba(157, 78, 221, 0.4)",
                    border: "1px solid rgba(157, 78, 221, 0.4)",
                    borderRadius: "8px",
                    padding: isMobile ? "12px 16px" : "9px 14px",
                    color: loading || !input.trim() ? "#555" : "#c084fc",
                    cursor:
                      loading || !input.trim() ? "not-allowed" : "pointer",
                    fontSize: "15px",
                    transition: "all 0.2s",
                    flexShrink: 0,
                  }}
                >
                  {loading ? <LoadingDots /> : "↑"}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// ── Message Bubble ─────────────────────────────────────────
function MessageBubble({
  message,
  isMobile,
}: {
  message: Message
  isMobile: boolean
}) {
  const isUser = message.role === "user"

  if (message.isStatus) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}
      >
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ color: "#9D4EDD", fontSize: "11px", fontStyle: "italic" }}
        >
          {message.text}
        </motion.span>
      </div>
    )
  }

  if (message.isDiscovery) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          background: "rgba(0, 245, 212, 0.08)",
          border: "1px solid rgba(0, 245, 212, 0.3)",
          borderRadius: "8px",
          padding: "8px 12px",
          color: "#00F5D4",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.04em",
        }}
      >
        {message.text}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
      }}
    >
      <div
        style={{
          maxWidth: isUser ? "82%" : "100%",
          background: isUser
            ? "rgba(157, 78, 221, 0.2)"
            : "rgba(255, 255, 255, 0.03)",
          border: `1px solid ${
            isUser ? "rgba(157, 78, 221, 0.35)" : "rgba(255,255,255,0.07)"
          }`,
          borderRadius: isUser ? "12px 12px 2px 12px" : "2px 12px 12px 12px",
          padding: isUser
            ? isMobile
              ? "11px 14px"
              : "9px 13px"
            : isMobile
              ? "13px 16px"
              : "13px 15px",
        }}
      >
        <p
          style={{
            color: isUser ? "#e9d5ff" : "#d0d4de",
            fontSize: isMobile
              ? isUser
                ? "14px"
                : "14px"
              : isUser
                ? "12.5px"
                : "13px",
            lineHeight: isUser ? 1.6 : 1.85,
            margin: 0,
            whiteSpace: "pre-wrap",
            fontFamily: "var(--font-outfit, inherit)",
          }}
        >
          {message.text}
          {message.streaming && message.text.length > 0 && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              style={{ color: "#9D4EDD", marginLeft: "2px" }}
            >
              ▋
            </motion.span>
          )}
          {message.streaming && message.text.length === 0 && <LoadingDots />}
        </p>
      </div>
    </motion.div>
  )
}

// ── Voice Button ───────────────────────────────────────────
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

function VoiceButton({
  onTranscript,
  disabled,
}: {
  onTranscript: (t: string) => void
  disabled?: boolean
}) {
  const hasHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
  const [state, setState] = useState<"idle" | "listening" | "processing">(
    "idle",
  )
  const [transcript, setTranscript] = useState("")
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const isMobile = useIsMobile()

  const isSupported =
    hasHydrated &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)

  // On iOS Safari, Speech Recognition is not supported
  if (!isSupported && isMobile) {
    return (
      <div
        title="Voice input not supported on iOS"
        style={{
          width: isMobile ? "42px" : "36px",
          height: isMobile ? "42px" : "36px",
          borderRadius: "50%",
          border: "1px solid rgba(157, 78, 221, 0.2)",
          background: "rgba(157, 78, 221, 0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.3,
          cursor: "not-allowed",
          flexShrink: 0,
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#888"
          strokeWidth="2"
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" y1="19" x2="12" y2="23"></line>
          <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
      </div>
    )
  }

  const startListening = () => {
    try {
      // Get Speech Recognition API
      const SRConstructor =
        window.SpeechRecognition || window.webkitSpeechRecognition

      if (!SRConstructor) {
        console.error("Speech Recognition not available in this browser")
        alert("Voice input not supported in your browser. Try Chrome or Edge.")
        return
      }

      const r = new SRConstructor()

      // Mobile optimizations
      if (isMobile) {
        r.continuous = false
        r.interimResults = false
      } else {
        r.continuous = false
        r.interimResults = true
      }

      r.lang = "en-US"

      r.onresult = (e: SpeechRecognitionEvent) => {
        try {
          if (!e.results || e.results.length === 0) {
            console.log("No results from speech recognition")
            return
          }

          const result = e.results[e.results.length - 1]
          if (!result || !result[0]) return

          const text = result[0].transcript
          console.log("Transcript:", text, "isFinal:", result.isFinal)
          setTranscript(text)

          if (result.isFinal) {
            setState("processing")
            onTranscript(text)
            setTranscript("")
            setState("idle")
          }
        } catch (err) {
          console.error("Error processing speech result:", err)
          setState("idle")
        }
      }

      r.onerror = (e: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", e.error)
        setState("idle")
        setTranscript("")

        // Handle specific errors
        if (e.error === "no-speech") {
          console.warn("No speech detected. Try speaking again.")
        } else if (e.error === "network") {
          console.error("Network error. Check your connection.")
        } else if (e.error === "permission-denied") {
          console.error(
            "Microphone permission denied. Please allow microphone access.",
          )
        } else if (e.error === "aborted") {
          console.log("Speech recognition was aborted")
        }
      }

      r.onend = () => {
        if (state === "listening") setState("idle")
      }

      recognitionRef.current = r
      r.start()
      setState("listening")
      console.log("Speech recognition started")
    } catch (err) {
      console.error("Failed to start speech recognition:", err)
      alert("Failed to start voice input. Please try again.")
      setState("idle")
    }
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setState("idle")
    setTranscript("")
  }

  const btnSize = isMobile ? "42px" : "36px"

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <AnimatePresence>
        {transcript && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            style={{
              position: "absolute",
              bottom: "calc(100% + 8px)",
              right: 0,
              background: "rgba(5, 5, 15, 0.96)",
              border: "1px solid rgba(157, 78, 221, 0.4)",
              borderRadius: "8px",
              padding: "6px 10px",
              color: "#c084fc",
              fontSize: "11px",
              whiteSpace: "nowrap",
              maxWidth: "220px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              zIndex: 100,
            }}
          >
            &quot;{transcript}&quot;
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={state === "listening" ? stopListening : startListening}
        disabled={disabled || state === "processing"}
        whileTap={{ scale: 0.92 }}
        style={{
          width: btnSize,
          height: btnSize,
          borderRadius: "50%",
          border: `1px solid ${
            state === "listening"
              ? "rgba(239, 68, 68, 0.6)"
              : "rgba(157, 78, 221, 0.4)"
          }`,
          background:
            state === "listening"
              ? "rgba(239, 68, 68, 0.15)"
              : "rgba(157, 78, 221, 0.08)",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          opacity: disabled ? 0.4 : 1,
          transition: "all 0.2s",
          flexShrink: 0,
        }}
      >
        {state === "listening" && (
          <motion.div
            animate={{ scale: [1, 1.7, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{
              position: "absolute",
              inset: -4,
              borderRadius: "50%",
              border: "1px solid rgba(239, 68, 68, 0.5)",
            }}
          />
        )}
        {state === "listening" ? (
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "2px",
              background: "#ef4444",
            }}
          />
        ) : (
          <svg
            width={isMobile ? "16" : "14"}
            height={isMobile ? "16" : "14"}
            viewBox="0 0 24 24"
            fill="none"
            stroke={state === "processing" ? "#555" : "#9D4EDD"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="8" y1="22" x2="16" y2="22" />
          </svg>
        )}
      </motion.button>
    </div>
  )
}

// ── Micro-components ───────────────────────────────────────
function BrainIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-4.66z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-4.66z" />
    </svg>
  )
}

function LoadingDots() {
  return (
    <span
      style={{
        display: "inline-flex",
        gap: "3px",
        marginLeft: "2px",
        verticalAlign: "middle",
      }}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
          style={{
            display: "inline-block",
            width: "4px",
            height: "4px",
            borderRadius: "50%",
            background: "#9D4EDD",
          }}
        />
      ))}
    </span>
  )
}
