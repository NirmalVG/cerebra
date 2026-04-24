"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useStore } from "@/store/useStore"
import { streamQuery } from "@/lib/api"

interface Message {
  id: string
  role: "user" | "assistant"
  text: string
  nodeIds?: string[]
  streaming?: boolean
  isStatus?: boolean // "Researching unknown territory..."
  isDiscovery?: boolean // "✦ New concept discovered"
}

export default function ChatOverlay() {
  const chatOpen = useStore((s) => s.chatOpen)
  const toggleChat = useStore((s) => s.toggleChat)
  const setHighlightedNodes = useStore((s) => s.setHighlightedNodes)
  const setSelectedNode = useStore((s) => s.setSelectedNode)
  const addDynamicNode = useStore((s) => s.addDynamicNode)
  const graph = useStore((s) => s.graph)

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

  // Auto-scroll on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Focus input when panel opens
  useEffect(() => {
    if (chatOpen) setTimeout(() => inputRef.current?.focus(), 300)
  }, [chatOpen])

  const runQuery = async (userText: string) => {
    if (!userText.trim() || loading) return
    setLoading(true)

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "user",
        text: userText,
      },
    ])

    // Placeholder assistant message — filled by streaming
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

        // onNodes — highlight in brain immediately
        (ids, _scores) => {
          setHighlightedNodes(ids)
          if (ids.length > 0 && graph) {
            const topNode = graph.nodes.find((n) => n.id === ids[0])
            if (topNode) setSelectedNode(topNode)
          }
        },

        // onChunk — stream text into assistant bubble
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, text: m.text + chunk, isStatus: false }
                : m,
            ),
          )
        },

        // onStatus — interim status message while researching
        (message) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, text: message, isStatus: true }
                : m,
            ),
          )
        },

        // onNewNode — dynamic node spawned in the brain
        (node) => {
          addDynamicNode(node)
          // Prepend discovery notice before the streamed analysis
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    text: `✦ New concept discovered: ${node.title}\n\n`,
                    isStatus: false,
                    isDiscovery: true,
                  }
                : m,
            ),
          )
        },

        // onDone
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
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                text: "Connection error — is the backend running on port 8000?",
                streaming: false,
                isStatus: false,
              }
            : m,
        ),
      )
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!input.trim() || loading) return
    const userText = input.trim()
    setInput("")
    await runQuery(userText)
  }

  const handleVoiceTranscript = async (text: string) => {
    setInput(text)
    // Short delay so user sees what was transcribed before submission
    await new Promise((r) => setTimeout(r, 400))
    setInput("")
    await runQuery(text)
  }

  return (
    <>
      {/* ── Toggle button ─────────────────────────── */}
      <motion.button
        onClick={toggleChat}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 80,
          background: chatOpen
            ? "rgba(157, 78, 221, 0.3)"
            : "rgba(157, 78, 221, 0.15)",
          border: "1px solid rgba(157, 78, 221, 0.5)",
          borderRadius: "50px",
          padding: "10px 18px",
          color: "#c084fc",
          fontSize: "13px",
          fontWeight: 600,
          cursor: "pointer",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          letterSpacing: "0.02em",
        }}
      >
        <BrainIcon />
        {chatOpen ? "Close" : "Ask Cerebra"}
      </motion.button>

      {/* ── Chat panel ────────────────────────────── */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{
              position: "fixed",
              bottom: "76px",
              right: "24px",
              zIndex: 70,
              width: "420px",
              height: "580px",
              background: "rgba(5, 5, 15, 0.94)",
              border: "1px solid rgba(157, 78, 221, 0.25)",
              borderRadius: "16px",
              backdropFilter: "blur(20px)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "14px 16px",
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

              {/* Clear conversation */}
              <button
                onClick={() =>
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
                  padding: "2px 6px",
                }}
              >
                clear
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
              }}
            >
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input row */}
            <div
              style={{
                padding: "12px",
                borderTop: "1px solid rgba(157, 78, 221, 0.15)",
                display: "flex",
                gap: "8px",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && handleSubmit()
                }
                placeholder="e.g. how does entropy relate to consciousness?"
                disabled={loading}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(157, 78, 221, 0.25)",
                  borderRadius: "8px",
                  padding: "9px 12px",
                  color: "#f8f9fa",
                  fontSize: "12px",
                  outline: "none",
                  fontFamily: "inherit",
                  opacity: loading ? 0.5 : 1,
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(157, 78, 221, 0.5)"
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(157, 78, 221, 0.25)"
                }}
              />

              {/* Voice button */}
              <VoiceButton
                onTranscript={handleVoiceTranscript}
                disabled={loading}
              />

              {/* Send button */}
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
                  padding: "9px 14px",
                  color: loading || !input.trim() ? "#555" : "#c084fc",
                  cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                  fontSize: "15px",
                  transition: "all 0.2s",
                  flexShrink: 0,
                }}
              >
                {loading ? <LoadingDots /> : "↑"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ── Message Bubble ─────────────────────────────────────────
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user"

  if (message.isStatus) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "4px 0",
        }}
      >
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{
            color: "#9D4EDD",
            fontSize: "11px",
            fontStyle: "italic",
            letterSpacing: "0.04em",
          }}
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
          padding: isUser ? "9px 13px" : "13px 15px",
        }}
      >
        <p
          style={{
            color: isUser ? "#e9d5ff" : "#d0d4de",
            fontSize: isUser ? "12.5px" : "13px",
            lineHeight: isUser ? 1.6 : 1.85,
            margin: 0,
            whiteSpace: "pre-wrap",
            fontFamily: "var(--font-outfit, inherit)",
          }}
        >
          {message.text}

          {/* Blinking cursor while streaming */}
          {message.streaming && message.text.length > 0 && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              style={{ color: "#9D4EDD", marginLeft: "2px" }}
            >
              ▋
            </motion.span>
          )}

          {/* Pulsing dots when streaming but no text yet */}
          {message.streaming && message.text.length === 0 && <LoadingDots />}
        </p>
      </div>
    </motion.div>
  )
}

// ── Voice Button ───────────────────────────────────────────
interface VoiceButtonProps {
  onTranscript: (text: string) => void
  disabled?: boolean
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: ((e: Event) => void) | null
  onend: (() => void) | null
}
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

function VoiceButton({ onTranscript, disabled }: VoiceButtonProps) {
  const [state, setState] = useState<"idle" | "listening" | "processing">(
    "idle",
  )
  const [transcript, setTranscript] = useState("")
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)

  if (!isSupported) return null

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = "en-US"

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const result = e.results[e.results.length - 1]
      const text = result[0].transcript
      setTranscript(text)

      if (result.isFinal) {
        setState("processing")
        onTranscript(text)
        setTranscript("")
        setState("idle")
      }
    }

    recognition.onerror = () => {
      setState("idle")
      setTranscript("")
    }
    recognition.onend = () => {
      if (state === "listening") setState("idle")
    }

    recognitionRef.current = recognition
    recognition.start()
    setState("listening")
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setState("idle")
    setTranscript("")
  }

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      {/* Live transcript preview */}
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
            "{transcript}"
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={state === "listening" ? stopListening : startListening}
        disabled={disabled || state === "processing"}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        style={{
          width: "36px",
          height: "36px",
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
        }}
      >
        {/* Pulse ring while listening */}
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
            width="14"
            height="14"
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
