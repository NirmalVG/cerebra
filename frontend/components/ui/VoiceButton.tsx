// components/ui/VoiceButton.tsx
"use client"

import { useState, useRef, useCallback, useSyncExternalStore } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface Props {
  onTranscript: (text: string) => void
  disabled?: boolean
}

// TypeScript type for the Web Speech API
// (not in standard TS lib — we declare it)
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

export default function VoiceButton({ onTranscript, disabled }: Props) {
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

  const isSupported =
    hasHydrated &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)

  const startListening = useCallback(() => {
    if (!isSupported) {
      alert("Voice input is not supported in this browser. Try Chrome.")
      return
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    const recognition = new SpeechRecognition()
    recognition.continuous = false // stop after first pause
    recognition.interimResults = true // show partial results
    recognition.lang = "en-US"

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      // Get the most recent result
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
  }, [isSupported, onTranscript, state])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setState("idle")
    setTranscript("")
  }, [])

  if (!isSupported) return null // hide button if not supported

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
      }}
    >
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
              background: "rgba(5, 5, 15, 0.95)",
              border: "1px solid rgba(157, 78, 221, 0.3)",
              borderRadius: "8px",
              padding: "6px 10px",
              color: "#c084fc",
              fontSize: "12px",
              whiteSpace: "nowrap",
              maxWidth: "250px",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            &quot;{transcript}&quot;
          </motion.div>
        )}
      </AnimatePresence>

      {/* Microphone button */}
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
              ? "rgba(239, 68, 68, 0.2)"
              : "rgba(157, 78, 221, 0.1)",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s",
          flexShrink: 0,
          opacity: disabled ? 0.4 : 1,
        }}
      >
        {/* Pulsing ring when listening */}
        {state === "listening" && (
          <motion.div
            animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
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
          // Stop icon
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "2px",
              background: "#ef4444",
            }}
          />
        ) : (
          // Microphone icon
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke={state === "processing" ? "#888" : "#9D4EDD"}
            strokeWidth="2"
            strokeLinecap="round"
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
