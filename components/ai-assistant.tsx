"use client"

import { useRef, useState, Fragment } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, X, Send } from "lucide-react"
import { MicButton } from "@/components/mic-button"

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, pi) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={pi} className="font-semibold">{part.slice(2, -2)}</strong>
    }
    return <Fragment key={pi}>{part}</Fragment>
  })
}

function renderMarkdown(text: string) {
  const lines = text.split("\n")
  const nodes: React.ReactNode[] = []
  let bulletBuffer: string[] = []
  let key = 0

  function flushBullets() {
    if (bulletBuffer.length === 0) return
    nodes.push(
      <ul key={key++} className="list-disc list-outside pl-4 my-1 space-y-0.5">
        {bulletBuffer.map((item, i) => (
          <li key={i} className="text-sm leading-relaxed">{renderInline(item)}</li>
        ))}
      </ul>
    )
    bulletBuffer = []
  }

  for (const line of lines) {
    if (/^[-─]{3,}$/.test(line.trim())) {
      flushBullets(); nodes.push(<hr key={key++} className="my-2 border-[#d1d5db]" />); continue
    }
    const h2 = line.match(/^##\s+(.+)/)
    if (h2) { flushBullets(); nodes.push(<p key={key++} className="text-sm font-bold mt-2 mb-0.5">{h2[1]}</p>); continue }
    const h3 = line.match(/^###\s+(.+)/)
    if (h3) { flushBullets(); nodes.push(<p key={key++} className="text-sm font-semibold mt-1.5 mb-0.5">{h3[1]}</p>); continue }
    const numbered = line.match(/^(\d+)\.\s+(.+)/)
    if (numbered) {
      flushBullets()
      nodes.push(<p key={key++} className="text-sm font-semibold mt-2 mb-0.5">{numbered[1]}. {renderInline(numbered[2])}</p>)
      continue
    }
    const bullet = line.match(/^[-*]\s+(.+)/)
    if (bullet) { bulletBuffer.push(bullet[1]); continue }
    if (!line.trim()) { flushBullets(); nodes.push(<br key={key++} />); continue }
    flushBullets()
    nodes.push(<span key={key++} className="block text-sm leading-relaxed">{renderInline(line)}</span>)
  }
  flushBullets()
  return nodes
}

interface Message {
  role: "user" | "assistant"
  content: string
}

export function AiAssistant() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"chat" | "record">("chat")

  // Chat mode state
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Record mode state
  const [recordInput, setRecordInput] = useState("")
  const [parsing, setParsing] = useState(false)
  const [recordError, setRecordError] = useState<string | null>(null)
  const [parsedFields, setParsedFields] = useState<{
    name: string; metAt: string; impression: string; tags: string[]
  } | null>(null)

  async function sendMessage() {
    const text = input.trim()
    if (!text || sending) return
    const newMessages: Message[] = [...messages, { role: "user", content: text }]
    setMessages(newMessages)
    setInput("")
    setSending(true)
    setChatError(null)
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, mode: "chat" }),
      })
      if (!res.ok) throw new Error("failed")
      const data = await res.json()
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }])
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
    } catch {
      setChatError("发送失败，请重试")
    } finally {
      setSending(false)
    }
  }

  function handleChatTranscript(text: string) {
    setInput((prev) => (prev ? prev + " " + text : text))
  }

  async function parseRecord() {
    const text = recordInput.trim()
    if (!text || parsing) return
    setParsing(true)
    setRecordError(null)
    setParsedFields(null)
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: text }], mode: "record" }),
      })
      if (!res.ok) throw new Error("failed")
      const data = await res.json()
      if (data.error === "parse_failed") {
        setRecordError("解析失败，请描述得更清楚一些")
      } else {
        setParsedFields(data.fields)
      }
    } catch {
      setRecordError("解析失败，请重试")
    } finally {
      setParsing(false)
    }
  }

  function confirmRecord() {
    if (!parsedFields) return
    const params = new URLSearchParams()
    if (parsedFields.name) params.set("name", parsedFields.name)
    if (parsedFields.metAt) params.set("metAt", parsedFields.metAt)
    if (parsedFields.impression) params.set("impression", parsedFields.impression)
    if (parsedFields.tags.length > 0) params.set("tags", parsedFields.tags.join(","))
    setOpen(false)
    router.push(`/new-person?${params.toString()}`)
  }

  function close() {
    setOpen(false)
    setMessages([])
    setInput("")
    setChatError(null)
    setRecordInput("")
    setParsedFields(null)
    setRecordError(null)
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-40 flex items-center justify-center w-12 h-12 rounded-full bg-[#3d6b2e] text-white shadow-lg hover:bg-[#2d5520] transition-colors"
        aria-label="AI 助手"
      >
        <Sparkles className="h-5 w-5" />
      </button>

      {/* Panel */}
      {open && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={close} />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl max-h-[70vh] flex flex-col max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#e8e0d8]">
              <div className="flex gap-3">
                <button
                  onClick={() => setMode("chat")}
                  className={`text-sm font-medium ${mode === "chat" ? "text-[#3d6b2e]" : "text-[#8b7d72]"}`}
                >
                  💬 对话
                </button>
                <button
                  onClick={() => setMode("record")}
                  className={`text-sm font-medium ${mode === "record" ? "text-[#3d6b2e]" : "text-[#8b7d72]"}`}
                >
                  ✍️ 录入
                </button>
              </div>
              <button onClick={close} className="text-[#8b7d72]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Chat mode */}
            {mode === "chat" && (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
                  {messages.length === 0 && (
                    <p className="text-sm text-[#8b7d72] text-center py-8">
                      问我关于你的联系人的任何事 ✨
                    </p>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                          m.role === "user"
                            ? "bg-[#3d6b2e] text-white"
                            : "bg-[#f0f0f0] text-[#2d2926]"
                        }`}
                      >
                        {m.role === "user" ? m.content : renderMarkdown(m.content)}
                      </div>
                    </div>
                  ))}
                  {sending && (
                    <div className="flex justify-start">
                      <div className="bg-[#f0f0f0] rounded-2xl px-4 py-2 text-sm text-[#8b7d72]">
                        思考中…
                      </div>
                    </div>
                  )}
                  {chatError && (
                    <p className="text-xs text-red-500 text-center">{chatError}</p>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="px-5 pb-6 pt-2 flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                    placeholder="输入消息…"
                    disabled={sending}
                    className="flex-1 rounded-full border border-[#e8e0d8] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d6b2e] disabled:opacity-50"
                  />
                  <MicButton
                    onTranscript={handleChatTranscript}
                    onError={(msg) => setChatError(msg)}
                    disabled={sending}
                    className="w-9 h-9 rounded-full border border-[#e8e0d8] bg-white text-[#8b7d72] hover:text-[#3d6b2e]"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !input.trim()}
                    className="w-9 h-9 rounded-full bg-[#3d6b2e] text-white flex items-center justify-center disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}

            {/* Record mode */}
            {mode === "record" && (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <textarea
                  value={recordInput}
                  onChange={(e) => setRecordInput(e.target.value)}
                  placeholder="描述你认识的新朋友，比如：今天在读书会认识了小明，他做 AI 的，北京人，聊得很投机…"
                  rows={4}
                  className="w-full rounded-xl border border-[#e8e0d8] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d6b2e] resize-none"
                />
                <div className="flex justify-end">
                  <MicButton
                    onTranscript={(text) => setRecordInput((prev) => prev ? prev + " " + text : text)}
                    onError={(msg) => setRecordError(msg)}
                    disabled={parsing}
                    className="text-[#8b7d72] hover:text-[#3d6b2e]"
                  />
                </div>
                {recordError && (
                  <p className="text-xs text-red-500">{recordError}</p>
                )}
                {parsedFields && (
                  <div className="rounded-xl bg-[#f7f4f1] p-4 space-y-1.5 text-sm">
                    {parsedFields.name && <p><span className="text-[#8b7d72]">姓名：</span>{parsedFields.name}</p>}
                    {parsedFields.metAt && <p><span className="text-[#8b7d72]">认识于：</span>{parsedFields.metAt}</p>}
                    {parsedFields.impression && <p><span className="text-[#8b7d72]">印象：</span>{parsedFields.impression}</p>}
                    {parsedFields.tags.length > 0 && <p><span className="text-[#8b7d72]">标签：</span>{parsedFields.tags.join("、")}</p>}
                    <button
                      onClick={confirmRecord}
                      className="mt-2 w-full rounded-full bg-[#3d6b2e] text-white text-sm py-2 hover:bg-[#2d5520]"
                    >
                      确认，去填表 →
                    </button>
                  </div>
                )}
                {!parsedFields && (
                  <button
                    onClick={parseRecord}
                    disabled={parsing || !recordInput.trim()}
                    className="w-full rounded-full bg-[#3d6b2e] text-white text-sm py-2.5 hover:bg-[#2d5520] disabled:opacity-40"
                  >
                    {parsing ? "解析中…" : "解析"}
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
