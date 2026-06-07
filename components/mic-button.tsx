"use client"

import { useRef, useState } from "react"
import { Mic, MicOff, Loader2 } from "lucide-react"

interface MicButtonProps {
  onTranscript: (text: string) => void
  onError?: (msg: string) => void
  disabled?: boolean
  className?: string
}

type State = "idle" | "recording" | "processing"

const MAX_DURATION_MS = 60_000

export function MicButton({ onTranscript, onError, disabled, className }: MicButtonProps) {
  const [state, setState] = useState<State>("idle")
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4"
      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        processAudio(mimeType)
      }
      recorder.start()
      recorderRef.current = recorder
      setState("recording")
      timerRef.current = setTimeout(stopRecording, MAX_DURATION_MS)
    } catch {
      onError?.("需要麦克风权限")
    }
  }

  function stopRecording() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    recorderRef.current?.stop()
    recorderRef.current = null
    setState("processing")
  }

  async function processAudio(mimeType: string) {
    const blob = new Blob(chunksRef.current, { type: mimeType })
    const formData = new FormData()
    formData.append("audio", blob, "recording.webm")
    try {
      const res = await fetch("/api/voice/transcribe", { method: "POST", body: formData })
      if (!res.ok) throw new Error("failed")
      const data = await res.json()
      onTranscript(data.text ?? "")
    } catch {
      onError?.("录音转换失败，请重试")
    } finally {
      setState("idle")
    }
  }

  function handleClick() {
    if (disabled || state === "processing") return
    if (state === "recording") { stopRecording(); return }
    startRecording()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || state === "processing"}
      className={`flex items-center justify-center transition-colors ${className ?? ""}`}
      aria-label={state === "recording" ? "停止录音" : "开始录音"}
    >
      {state === "idle" && <Mic className="h-4 w-4" />}
      {state === "recording" && <MicOff className="h-4 w-4 text-red-500 animate-pulse" />}
      {state === "processing" && <Loader2 className="h-4 w-4 animate-spin" />}
    </button>
  )
}
