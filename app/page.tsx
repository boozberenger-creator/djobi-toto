"use client"

import { useState, useRef, useCallback } from "react"
import { Mic, MicOff, Volume2, RotateCcw, Loader2 } from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://hfdjobii-djobi-toto.hf.space"

type Message = {
  role: "user" | "djobi"
  text: string
  audioUrl?: string
}

export default function Home() {
  const [messages, setMessages]       = useState<Message[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [isLoading, setIsLoading]     = useState(false)
  const [error, setError]             = useState("")
  const [asrChoice, setAsrChoice]     = useState<"meta" | "djobi">("meta")
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef        = useRef<Blob[]>([])
  const chatEndRef       = useRef<HTMLDivElement>(null)

  const startRecording = useCallback(async () => {
    setError("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
      chunksRef.current = []
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.onstop = () => sendAudio(new Blob(chunksRef.current, { type: "audio/webm" }))
      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch {
      setError("Microphone non accessible. Vérifie les permissions.")
    }
  }, [])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop())
    setIsRecording(false)
  }, [])

  const sendAudio = async (blob: Blob) => {
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("audio", blob, "recording.webm")
      formData.append("history", JSON.stringify(messages.map(m => [m.role, m.text])))
      formData.append("asr_choice", asrChoice)

      const res = await fetch(`${API_BASE}/api/chat`, { method: "POST", body: formData })
      if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`)
      const data = await res.json()

      const audioUrl = data.audio_b64
        ? `data:audio/wav;base64,${data.audio_b64}`
        : undefined

      setMessages(prev => [
        ...prev,
        { role: "user",  text: data.moore_question || "..." },
        { role: "djobi", text: data.moore_response || "...", audioUrl },
      ])

      if (audioUrl) new Audio(audioUrl).play()
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
    } catch (e) {
      setError(String(e))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-950 to-green-900 flex flex-col items-center px-4 py-8">

      {/* Header */}
      <div className="text-center mb-6">
        <div className="text-5xl mb-2">🎓</div>
        <h1 className="text-4xl font-bold text-white tracking-tight">Djobi Toto</h1>
        <p className="text-green-300 mt-1">Cours en Mooré — Pour les jeunes du Burkina</p>
      </div>

      {/* Chat */}
      <div className="w-full max-w-xl bg-green-900/40 rounded-2xl border border-green-700/50 flex flex-col overflow-hidden mb-5"
           style={{ minHeight: 360, maxHeight: 460 }}>
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-green-400 p-8 text-center">
            <div className="text-5xl mb-4">🎤</div>
            <p className="text-lg font-medium text-white">Appuie sur le micro</p>
            <p className="text-sm mt-1 text-green-400">Parle en Mooré — Djobi t&apos;écoute et répond</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-green-500 text-white rounded-br-sm"
                    : "bg-white/10 text-green-100 rounded-bl-sm"
                }`}>
                  {msg.role === "djobi" && (
                    <div className="flex items-center gap-1 mb-1 text-green-400 text-xs font-semibold uppercase tracking-wide">
                      <Volume2 size={11} /> Djobi
                    </div>
                  )}
                  <p>{msg.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1 items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="w-full max-w-xl bg-red-900/50 border border-red-700 rounded-xl px-4 py-2 text-red-300 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Toggle ASR */}
      <div className="flex items-center gap-2 mb-2 bg-green-900/40 rounded-full px-4 py-2 border border-green-700/50">
        <span className="text-green-400 text-xs">ASR:</span>
        <button
          onClick={() => setAsrChoice("meta")}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            asrChoice === "meta"
              ? "bg-green-500 text-white"
              : "text-green-400 hover:text-green-300"
          }`}
        >
          Meta MMS-1B
        </button>
        <span className="text-green-700 text-xs">|</span>
        <button
          onClick={() => setAsrChoice("djobi")}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            asrChoice === "djobi"
              ? "bg-green-500 text-white"
              : "text-green-400 hover:text-green-300"
          }`}
        >
          Djobi fine-tuné
        </button>
      </div>

      {/* Mic button */}
      <div className="flex flex-col items-center gap-3">
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          disabled={isLoading}
          className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-150 select-none
            ${isRecording
              ? "bg-red-500 scale-110 ring-4 ring-red-400/40"
              : isLoading
                ? "bg-green-800 cursor-not-allowed opacity-60"
                : "bg-green-500 hover:bg-green-400 active:scale-95 shadow-green-500/30"
            }`}
        >
          {isLoading
            ? <Loader2 size={32} className="animate-spin" />
            : isRecording
              ? <MicOff size={32} />
              : <Mic size={32} />
          }
        </button>

        <p className="text-green-400 text-sm font-medium">
          {isRecording ? "🔴 Relâche pour envoyer" :
           isLoading   ? "Djobi réfléchit..." :
                         "Maintiens pour parler"}
        </p>

        {messages.length > 0 && !isLoading && (
          <button
            onClick={() => { setMessages([]); setError("") }}
            className="flex items-center gap-1.5 text-green-600 hover:text-green-400 text-xs mt-1 transition-colors"
          >
            <RotateCcw size={12} /> Nouvelle conversation
          </button>
        )}
      </div>

      <p className="text-green-800 text-xs mt-12">Djobi Toto — Éducation pour tous, en toutes langues</p>
    </main>
  )
}
