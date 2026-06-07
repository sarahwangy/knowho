"use client"

import { useRef, useState } from "react"
import { Send } from "lucide-react"
import { MicButton } from "@/components/mic-button"

interface Message {
  role: "user" | "assistant"
  content: string
}

const CHARACTERS = [
  { id: "default", name: "Knowho", emoji: "🌿", desc: "关系助手", tone: "" },
  { id: "susu", name: "苏苏", emoji: "🦉", desc: "睿智分析", tone: "你的风格睿智、善于深度分析，回答时多从不同角度思考。" },
  { id: "nuuan", name: "小暖", emoji: "☀️", desc: "温暖鼓励", tone: "你的风格温暖、善于鼓励，让用户感到被支持和理解。" },
  { id: "mingge", name: "明哥", emoji: "🎯", desc: "直接高效", tone: "你的风格直接、简洁，给出最明确的建议，不废话。" },
]

export default function AiPage() {
  const [characterId, setCharacterId] = useState("default")
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [voiceReply, setVoiceReply] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const character = CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0]

  function speakText(text: string) {
    if (!voiceReply || typeof window === "undefined" || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = "zh-CN"
    utter.rate = 1.0
    utter.pitch = character.id === "nuuan" ? 1.2 : character.id === "mingge" ? 0.9 : 1.0
    window.speechSynthesis.speak(utter)
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || sending) return
    const newMessages: Message[] = [...messages, { role: "user", content: text }]
    setMessages(newMessages)
    setInput("")
    setSending(true)
    setError(null)
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          mode: "chat",
          characterTone: character.tone || undefined,
        }),
      })
      if (!res.ok) throw new Error("failed")
      const data = await res.json()
      const reply = data.reply as string
      setMessages((prev) => [...prev, { role: "assistant", content: reply }])
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
      speakText(reply)
    } catch {
      setError("发送失败，请重试")
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Character selector */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {CHARACTERS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCharacterId(c.id)}
              className={`flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl shrink-0 transition-colors ${
                characterId === c.id
                  ? "bg-white shadow-sm"
                  : "bg-white/20 hover:bg-white/30"
              }`}
            >
              <span className="text-2xl">{c.emoji}</span>
              <span className={`text-xs font-semibold ${characterId === c.id ? "text-[#3d6b2e]" : "text-white"}`}>
                {c.name}
              </span>
              <span className={`text-[10px] ${characterId === c.id ? "text-[#8b7d72]" : "text-white/60"}`}>
                {c.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Voice reply toggle */}
      <div className="px-5 pb-2 flex items-center justify-end gap-2">
        <span className="text-xs text-white/60">语音回复</span>
        <button
          type="button"
          onClick={() => {
            if (voiceReply && typeof window !== "undefined") window.speechSynthesis?.cancel()
            setVoiceReply((v) => !v)
          }}
          className={`relative w-10 h-5 rounded-full transition-colors ${voiceReply ? "bg-[#3d6b2e]" : "bg-white/30"}`}
          aria-label="切换语音回复"
        >
          <span
            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              voiceReply ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-5xl">{character.emoji}</span>
            <p className="text-white font-semibold">{character.name}</p>
            <p className="text-white/60 text-sm">{character.desc}</p>
            <p className="text-white/50 text-xs mt-2">问我关于你的联系人的任何事 ✨</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <span className="mr-2 mt-1 text-lg shrink-0">{character.emoji}</span>
            )}
            <div
              className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-[#3d6b2e] text-white rounded-br-sm"
                  : "bg-white text-[#2d2926] shadow-sm rounded-bl-sm"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <span className="mr-2 mt-1 text-lg">{character.emoji}</span>
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
              <div className="flex gap-1 items-center h-5">
                <span className="w-1.5 h-1.5 bg-[#8b7d72] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-[#8b7d72] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-[#8b7d72] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        {error && <p className="text-xs text-red-300 text-center">{error}</p>}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="px-4 pb-20 md:pb-6 pt-2">
        <div className="flex gap-2 bg-white rounded-2xl px-3 py-2 shadow-sm">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder={`和 ${character.name} 说话…`}
            disabled={sending}
            className="flex-1 text-sm text-[#2d2926] focus:outline-none disabled:opacity-50 bg-transparent"
          />
          <MicButton
            onTranscript={(text) => setInput((prev) => prev ? prev + " " + text : text)}
            onError={(msg) => setError(msg)}
            disabled={sending}
            className="w-8 h-8 rounded-full text-[#8b7d72] hover:text-[#3d6b2e] flex items-center justify-center"
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            className="w-8 h-8 rounded-full bg-[#3d6b2e] text-white flex items-center justify-center disabled:opacity-40 shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </main>
  )
}
