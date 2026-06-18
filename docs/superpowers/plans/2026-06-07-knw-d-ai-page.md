# KNW-D AI Dedicated Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a dedicated `/ai` page with full-screen chat, 4 character personas (affecting tone), and voice reply using browser's built-in SpeechSynthesis API. Add AI tab to the nav.

**Architecture:**
- New page: `app/ai/page.tsx` — full-screen chat (Client Component)
- Modify: `app/api/ai/chat/route.ts` — accept optional `characterTone` param to adjust system prompt
- Modify: `components/nav.tsx` — add AI tab (Bot icon)
- Characters are defined client-side; tone modifier is passed to the API
- Voice reply uses `window.speechSynthesis` (free, no API key, works in browser)

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, Anthropic claude-haiku, Web Speech API (SpeechSynthesis)

---

## File Map

| File | Change |
|------|--------|
| `app/ai/page.tsx` | Create — full-screen AI chat page |
| `app/api/ai/chat/route.ts` | Modify — accept `characterTone` param |
| `components/nav.tsx` | Modify — add AI tab |

---

### Task 1: Update API to accept characterTone + create /ai page

**Files:**
- Modify: `app/api/ai/chat/route.ts`
- Create: `app/ai/page.tsx`

- [ ] **Step 1: Read the API route**

Read `app/api/ai/chat/route.ts`.

- [ ] **Step 2: Modify the API to accept characterTone**

In the POST handler body parsing section, add `characterTone` as an optional field:

```ts
const { messages, mode, characterTone } = body
```

In the **chat mode** section, where `systemPrompt` is built, append the characterTone if provided:

Find the line:
```ts
const systemPrompt = contacts.length > 0
  ? `你是用户的私人关系助手，帮助他回忆和维护人际关系。用户的联系人如下：\n${contactSummary}\n\n请用中文简洁回答。`
  : `你是用户的私人关系助手，用户目前还没有添加任何联系人。请用中文回答。`
```

Change to:
```ts
const toneSuffix = characterTone ? `\n\n${characterTone}` : ""
const systemPrompt = contacts.length > 0
  ? `你是用户的私人关系助手，帮助他回忆和维护人际关系。用户的联系人如下：\n${contactSummary}\n\n请用中文简洁回答。${toneSuffix}`
  : `你是用户的私人关系助手，用户目前还没有添加任何联系人。请用中文回答。${toneSuffix}`
```

- [ ] **Step 3: Create app/ai/page.tsx**

Create the full-screen AI chat page:

```tsx
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
    if (!voiceReply || !window.speechSynthesis) return
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
            if (voiceReply) window.speechSynthesis?.cancel()
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
```

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && git add app/ai/page.tsx app/api/ai/chat/route.ts && git commit -m "feat(ai): dedicated /ai page with character selection and voice reply"
```

---

### Task 2: Add AI tab to nav

**Files:**
- Modify: `components/nav.tsx`

- [ ] **Step 1: Read components/nav.tsx**

Read the file.

- [ ] **Step 2: Add AI tab**

Add `Bot` to the lucide-react import.

Add a 4th item to `NAV_ITEMS`:
```tsx
{ href: "/ai", label: "AI", icon: Bot },
```

The nav already handles any number of items in NAV_ITEMS — no other changes needed.

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && git add components/nav.tsx && git commit -m "feat(nav): add AI tab to navigation"
```
