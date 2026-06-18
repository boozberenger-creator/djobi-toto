"use client"

import { useState, useRef, useCallback } from "react"
import { Mic, MicOff, Volume2, Settings, Loader2, ChevronDown } from "lucide-react"

// ─── Config ────────────────────────────────────────────────────────────────────
const ASR_OPTIONS = [
  { id: "whisper", label: "Whisper 37.9%", sub: "Voix propre (recommandé)" },
  { id: "mms",    label: "MMS 26.4%",     sub: "Discours radio/TV" },
]
const LLM_OPTIONS = [
  { id: "llama",  label: "Llama (Meta)",     sub: "via Groq — très rapide" },
  { id: "claude", label: "Claude (Anthropic)", sub: "Haiku — fallback" },
]
const LANG_OPTIONS = [
  { id: "moore",    label: "Mooré" },
  { id: "francais", label: "Français" },
]
const VOICE_OPTIONS = [
  { id: "voix1", label: "Voix 1",            sub: "Savane TV" },
  { id: "voix2", label: "Djobi (Voix 2)",    sub: "Savane TV" },
  { id: "voix3", label: "Salimata (Voix 3)", sub: "Savane TV" },
  { id: "aicha", label: "Aïcha",             sub: "Femme" },
  { id: "noaga", label: "Noaga",             sub: "Homme" },
]

type Message = {
  role: "user" | "djobi"
  text: string
  textFr?: string
  audioUrl?: string
}

// ─── Composant principal ───────────────────────────────────────────────────────
export default function ParlerPage() {
  const [asrModel,    setAsrModel]    = useState("whisper")
  const [llmModel,    setLlmModel]    = useState("llama")
  const [inputLang,   setInputLang]   = useState("moore")
  const [voice,       setVoice]       = useState("voix1")
  const [showSettings, setShowSettings] = useState(true)

  const [messages,    setMessages]    = useState<Message[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [isLoading,   setIsLoading]   = useState(false)
  const [loadingStep, setLoadingStep] = useState("")
  const [error,       setError]       = useState("")

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef        = useRef<Blob[]>([])
  const chatEndRef       = useRef<HTMLDivElement>(null)
  const historyRef       = useRef<Message[]>([])

  // Garder historyRef synchronisé avec messages
  const addMessage = (msg: Message) => {
    setMessages(prev => {
      const next = [...prev, msg]
      historyRef.current = next
      return next
    })
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
  }

  const startRecording = useCallback(async () => {
    setError("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg"
      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      recorder.ondataavailable = e => chunksRef.current.push(e.data)
      recorder.onstop = () =>
        sendAudio(new Blob(chunksRef.current, { type: mimeType }))
      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch {
      setError("Microphone non accessible — vérifie les permissions du navigateur.")
    }
  }, [])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop())
    setIsRecording(false)
  }, [])

  const sendAudio = async (blob: Blob) => {
    if (isLoading) return
    setIsLoading(true)
    setError("")

    try {
      // ── 1. Transcription ASR ──────────────────────────────────────────────
      setLoadingStep("Transcription ASR…")
      const formData = new FormData()
      formData.append("audio", blob, "recording.webm")
      formData.append("asr_model", asrModel)
      formData.append("input_lang", inputLang)

      const tRes = await fetch("/api/transcribe", { method: "POST", body: formData })
      const tData = await tRes.json()

      if (tData.loading) {
        setError("Modèle en chargement (cold start) — réessaie dans 30 secondes.")
        return
      }
      if (!tData.text?.trim()) {
        setError(tData.error || "Rien transcrit — parle plus fort ou plus lentement.")
        return
      }

      const userText = tData.text.trim()
      addMessage({ role: "user", text: userText })

      // ── 2. LLM + traduction ───────────────────────────────────────────────
      setLoadingStep("Djobi réfléchit…")
      const history = historyRef.current.slice(-8).map(m => ({
        role: m.role,
        text: m.text,
      }))

      const cRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          lang: inputLang,
          model: llmModel,
          history,
        }),
      })
      const cData = await cRes.json()
      const responseText = cData.text?.trim() || "…"

      // ── 3. Synthèse vocale TTS ────────────────────────────────────────────
      setLoadingStep("Synthèse vocale…")
      let audioUrl: string | undefined
      try {
        const sRes = await fetch("/api/synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: responseText, voice }),
        })
        if (sRes.ok && sRes.headers.get("content-type")?.startsWith("audio")) {
          const audioBlob = await sRes.blob()
          audioUrl = URL.createObjectURL(audioBlob)
          new Audio(audioUrl).play().catch(() => null)
        }
      } catch { /* TTS optionnelle */ }

      addMessage({
        role: "djobi",
        text: responseText,
        textFr: cData.text_fr,
        audioUrl,
      })

    } catch (e) {
      setError(String(e))
    } finally {
      setIsLoading(false)
      setLoadingStep("")
    }
  }

  // ─── Rendu ────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-950 to-green-900 flex flex-col items-center px-4 py-6">

      {/* En-tête */}
      <div className="w-full max-w-xl flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center text-xl shadow-lg">
          🦁
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Djobi Tôtô</h1>
          <p className="text-green-400 text-xs">Parler en mooré</p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="ml-auto flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
        >
          <Settings size={13} />
          Réglages
          <ChevronDown size={12} className={`transition-transform ${showSettings ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Panneau de réglages */}
      {showSettings && (
        <div className="w-full max-w-xl bg-green-900/60 border border-green-700/50 rounded-2xl p-4 mb-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">

            {/* Modèle IA */}
            <div>
              <p className="text-green-400 text-[11px] font-semibold uppercase tracking-wide mb-2">
                Modèle IA
              </p>
              <div className="flex flex-col gap-1.5">
                {LLM_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setLlmModel(opt.id)}
                    className={`text-left px-3 py-2 rounded-xl text-xs transition-colors border ${
                      llmModel === opt.id
                        ? "bg-green-500 border-green-400 text-white"
                        : "bg-white/5 border-transparent text-green-300 hover:bg-white/10"
                    }`}
                  >
                    <div className="font-semibold">{opt.label}</div>
                    <div className={`text-[10px] mt-0.5 ${llmModel === opt.id ? "text-green-100" : "text-green-500"}`}>
                      {opt.sub}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ASR mooré */}
            <div>
              <p className={`text-[11px] font-semibold uppercase tracking-wide mb-2 ${
                inputLang === "francais" ? "text-green-700" : "text-green-400"
              }`}>
                ASR mooré
              </p>
              <div className={`flex flex-col gap-1.5 ${inputLang === "francais" ? "opacity-40 pointer-events-none" : ""}`}>
                {ASR_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setAsrModel(opt.id)}
                    className={`text-left px-3 py-2 rounded-xl text-xs transition-colors border ${
                      asrModel === opt.id
                        ? "bg-green-500 border-green-400 text-white"
                        : "bg-white/5 border-transparent text-green-300 hover:bg-white/10"
                    }`}
                  >
                    <div className="font-semibold">{opt.label}</div>
                    <div className={`text-[10px] mt-0.5 ${asrModel === opt.id ? "text-green-100" : "text-green-500"}`}>
                      {opt.sub}
                    </div>
                  </button>
                ))}
              </div>
              {inputLang === "francais" && (
                <p className="text-green-600 text-[10px] mt-1">Whisper standard utilisé pour le français</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">

            {/* Langue d'entrée */}
            <div>
              <p className="text-green-400 text-[11px] font-semibold uppercase tracking-wide mb-2">
                Langue d&apos;entrée
              </p>
              <div className="flex gap-2">
                {LANG_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setInputLang(opt.id)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors border ${
                      inputLang === opt.id
                        ? "bg-green-500 border-green-400 text-white"
                        : "bg-white/5 border-transparent text-green-300 hover:bg-white/10"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Voix */}
            <div>
              <p className="text-green-400 text-[11px] font-semibold uppercase tracking-wide mb-2">
                Voix de sortie
              </p>
              <div className="flex flex-col gap-1">
                {VOICE_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setVoice(opt.id)}
                    className={`text-left px-3 py-1.5 rounded-xl text-xs transition-colors border ${
                      voice === opt.id
                        ? "bg-amber-500 border-amber-400 text-white"
                        : "bg-white/5 border-transparent text-green-300 hover:bg-white/10"
                    }`}
                  >
                    <span className="font-semibold">{opt.label}</span>
                    <span className={`ml-1.5 text-[10px] ${voice === opt.id ? "text-amber-100" : "text-green-500"}`}>
                      {opt.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zone de chat */}
      <div
        className="w-full max-w-xl bg-green-900/40 rounded-2xl border border-green-700/50 flex flex-col overflow-hidden mb-4"
        style={{ minHeight: 260, maxHeight: 380 }}
      >
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="text-5xl mb-4">🎤</div>
            <p className="text-lg font-bold text-white">Appuie sur le micro</p>
            <p className="text-sm mt-1 text-green-400">
              {inputLang === "moore"
                ? "Parle en Mooré — Djobi t'écoute et répond en Mooré"
                : "Parle en Français — Djobi répond en Mooré"}
            </p>
            <div className="mt-3 flex gap-2 flex-wrap justify-center">
              <span className="bg-green-900 border border-green-700 text-green-400 text-[11px] px-2.5 py-1 rounded-full">
                {LLM_OPTIONS.find(m => m.id === llmModel)?.label}
              </span>
              {inputLang === "moore" && (
                <span className="bg-green-900 border border-green-700 text-green-400 text-[11px] px-2.5 py-1 rounded-full">
                  {ASR_OPTIONS.find(m => m.id === asrModel)?.label}
                </span>
              )}
              <span className="bg-amber-900/40 border border-amber-700/50 text-amber-400 text-[11px] px-2.5 py-1 rounded-full">
                {VOICE_OPTIONS.find(v => v.id === voice)?.label}
              </span>
            </div>
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
                  {msg.textFr && msg.textFr !== msg.text && (
                    <p className="text-green-400/70 text-[11px] mt-1 italic">{msg.textFr}</p>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-green-400" />
                  <span className="text-green-400 text-xs">{loadingStep || "…"}</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Erreur */}
      {error && (
        <div className="w-full max-w-xl bg-red-900/50 border border-red-700 rounded-xl px-4 py-2 text-red-300 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Bouton micro */}
      <div className="flex flex-col items-center gap-3">
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          disabled={isLoading}
          className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-150 select-none ${
            isRecording
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
            : <Mic size={32} />}
        </button>
        <p className="text-green-400 text-sm font-medium">
          {isRecording
            ? "🔴 Relâche pour envoyer"
            : isLoading
            ? loadingStep
            : "Maintiens pour parler"}
        </p>
        {messages.length > 0 && !isLoading && (
          <button
            onClick={() => { setMessages([]); historyRef.current = []; setError("") }}
            className="text-green-700 hover:text-green-500 text-xs mt-1 transition-colors"
          >
            ↺ Nouvelle conversation
          </button>
        )}
      </div>
    </main>
  )
}
