# KNW-020 AI Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a floating AI assistant supporting free-form contact queries (chat mode) and natural-language contact entry parsing (record mode).

**Architecture:** `POST /api/ai/chat` loads the user's contacts as system context and calls `claude-haiku-4-5-20251001`. The `AiAssistant` Client Component is a bottom sheet mounted globally in `layout.tsx` (conditionally on session). Record mode returns structured JSON fields; `/new-person` reads URL params to pre-fill the form.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, `@anthropic-ai/sdk`, Prisma 7

---

## File Map

| File | Change |
|------|--------|
| `app/api/ai/chat/route.ts` | Create — POST chat handler |
| `components/ai-assistant.tsx` | Create — floating chat UI |
| `app/layout.tsx` | Modify — mount AiAssistant conditionally |
| `app/new-person/page.tsx` | Modify — read URL params to pre-fill form |

---

### Task 1: Install Anthropic SDK + create `app/api/ai/chat/route.ts`

**Files:**
- Create: `app/api/ai/chat/route.ts`

- [ ] **Step 1: Install the SDK**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npm install @anthropic-ai/sdk
```

Expected: package added to node_modules, package.json updated.

- [ ] **Step 2: Add env variable**

Add to `.env.local`:
```
ANTHROPIC_API_KEY=your_key_here
```

- [ ] **Step 3: Create the route file**

```ts
import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  let body: { messages: { role: "user" | "assistant"; content: string }[]; mode: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { messages, mode } = body
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 })
  }

  try {
    if (mode === "record") {
      const userText = messages[messages.length - 1].content
      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        system: `从用户的描述中提取联系人信息，只返回以下 JSON，不要其他内容：
{"name":"","metAt":"","impression":"","tags":[]}
无法确定的字段留空字符串。tags 是字符串数组。`,
        messages: [{ role: "user", content: userText }],
      })
      const raw = response.content[0].type === "text" ? response.content[0].text : ""
      try {
        const fields = JSON.parse(raw)
        return NextResponse.json({ fields })
      } catch {
        return NextResponse.json({ error: "parse_failed" }, { status: 422 })
      }
    }

    // mode === "chat"
    const contacts = await prisma.contact.findMany({
      where: { userId, deletedAt: null },
      select: {
        name: true,
        metAt: true,
        impression: true,
        contactFreq: true,
        tags: { select: { name: true } },
        interactions: {
          orderBy: { date: "desc" },
          take: 1,
          select: { date: true },
        },
      },
    })

    const contactSummary = contacts
      .map((c) => {
        const tags = c.tags.map((t) => t.name).join("、")
        const last = c.interactions[0]?.date.toISOString().slice(0, 10) ?? "从未"
        return `- ${c.name}（认识于：${c.metAt ?? "未知"}；印象：${c.impression ?? "无"}；标签：${tags || "无"}；最近互动：${last}）`
      })
      .join("\n")

    const systemPrompt = contacts.length > 0
      ? `你是用户的私人关系助手，帮助他回忆和维护人际关系。用户的联系人如下：\n${contactSummary}\n\n请用中文简洁回答。`
      : `你是用户的私人关系助手，用户目前还没有添加任何联系人。请用中文回答。`

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    })

    const reply = response.content[0].type === "text" ? response.content[0].text : ""
    return NextResponse.json({ reply })
  } catch {
    return NextResponse.json({ error: "AI request failed" }, { status: 500 })
  }
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/ai/chat/route.ts package.json package-lock.json && git commit -m "feat(knw-020): add POST /api/ai/chat route"
```

---

### Task 2: Create `components/ai-assistant.tsx`

**Files:**
- Create: `components/ai-assistant.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, X, Send } from "lucide-react"

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
        className="fixed bottom-20 left-4 md:bottom-6 z-40 w-12 h-12 rounded-full bg-[#3d6b2e] text-white shadow-lg flex items-center justify-center hover:bg-[#2d5520] transition-colors"
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
                        {m.content}
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/ai-assistant.tsx && git commit -m "feat(knw-020): add AiAssistant component"
```

---

### Task 3: Mount AiAssistant in layout + update new-person page

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/new-person/page.tsx`

- [ ] **Step 1: Read both files**

Read `/Users/sha/Code/AI-code-26/5-konwho/app/layout.tsx` and `/Users/sha/Code/AI-code-26/5-konwho/app/new-person/page.tsx`.

- [ ] **Step 2: Update layout.tsx**

Replace the current file content with:

```tsx
import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { Nav } from "@/components/nav"
import { AiAssistant } from "@/components/ai-assistant"
import { auth } from "@/auth"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Knowho",
  description: "Remember everyone you meet.",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  return (
    <html lang="zh">
      <body className={`${geist.className} pb-16 md:pt-14 bg-[#7a9e6a]`}>
        <Nav />
        {session?.user && <AiAssistant />}
        <div className="max-w-2xl mx-auto w-full">
          {children}
        </div>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Update new-person/page.tsx to read URL params**

At the top of the file, add the import:
```tsx
import { useSearchParams } from "next/navigation"
```

Inside `NewPersonPage()`, after the `useRouter()` call, add:
```tsx
const searchParams = useSearchParams()
```

Change the `useForm` call to use defaultValues from URL params:
```tsx
const {
  register,
  handleSubmit,
  formState: { errors, isSubmitting },
} = useForm<FormValues>({
  resolver: zodResolver(schema),
  defaultValues: {
    name: searchParams.get("name") ?? "",
    metAt: searchParams.get("metAt") ?? "",
    impression: searchParams.get("impression") ?? "",
  },
})
```

Also initialize tags from URL params. After the `useForm` block, change the `selectedTags` state initialization:
```tsx
const [selectedTags, setSelectedTags] = useState<SelectedTag[]>(() => {
  const tagsParam = searchParams.get("tags")
  if (!tagsParam) return []
  return tagsParam.split(",").filter(Boolean).map((name) => ({ name }))
})
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/new-person/page.tsx && git commit -m "feat(knw-020): mount AiAssistant in layout, prefill new-person from URL params"
```
