# KNW-021 Voice Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable voice recording in the AI assistant and new-person page; audio is transcribed via OpenAI Whisper API.

**Architecture:** `MicButton` component handles MediaRecorder lifecycle and POSTs audio to `/api/voice/transcribe`, which forwards to Whisper. The text is returned to the caller via `onTranscript`. KNW-020 (AI Assistant) must be complete first.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, `openai` SDK, MediaRecorder API

**Dependency:** KNW-020 must be complete before starting this ticket.

---

## File Map

| File | Change |
|------|--------|
| `app/api/voice/transcribe/route.ts` | Create — POST Whisper proxy |
| `components/mic-button.tsx` | Create — reusable recording button |
| `components/ai-assistant.tsx` | Modify — add MicButton to chat + record inputs |
| `app/new-person/page.tsx` | Modify — replace disabled voice button with MicButton |

---

### Task 1: Install OpenAI SDK + create `app/api/voice/transcribe/route.ts`

**Files:**
- Create: `app/api/voice/transcribe/route.ts`

- [ ] **Step 1: Install the SDK**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npm install openai
```

Expected: package added, package.json updated.

- [ ] **Step 2: Add env variable**

Add to `.env.local`:
```
OPENAI_API_KEY=your_key_here
```

- [ ] **Step 3: Create the route file**

```ts
import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { auth } from "@/auth"

export const runtime = "nodejs"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const audioFile = formData.get("audio")
  if (!audioFile || !(audioFile instanceof Blob)) {
    return NextResponse.json({ error: "audio field required" }, { status: 400 })
  }

  if (audioFile.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 })
  }

  try {
    const file = new File([audioFile], "recording.webm", { type: audioFile.type || "audio/webm" })
    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file,
      language: "zh",
    })
    return NextResponse.json({ text: transcription.text })
  } catch {
    return NextResponse.json({ error: "Transcription failed" }, { status: 502 })
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
git add app/api/voice/transcribe/route.ts package.json package-lock.json && git commit -m "feat(knw-021): add POST /api/voice/transcribe route"
```

---

### Task 2: Create `components/mic-button.tsx`

**Files:**
- Create: `components/mic-button.tsx`

- [ ] **Step 1: Create the component**

```tsx
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/mic-button.tsx && git commit -m "feat(knw-021): add reusable MicButton component"
```

---

### Task 3: Integrate MicButton into `components/ai-assistant.tsx`

**Files:**
- Modify: `components/ai-assistant.tsx`

- [ ] **Step 1: Read the current file**

Read `/Users/sha/Code/AI-code-26/5-konwho/components/ai-assistant.tsx`.

- [ ] **Step 2: Add MicButton import**

Add to the imports at the top:
```tsx
import { MicButton } from "@/components/mic-button"
```

- [ ] **Step 3: Add mic handler for chat mode**

Inside `AiAssistant`, add this handler after `sendMessage`:
```tsx
function handleChatTranscript(text: string) {
  setInput((prev) => (prev ? prev + " " + text : text))
}
```

- [ ] **Step 4: Add MicButton to the chat input row**

Find the chat input row:
```tsx
<div className="px-5 pb-6 pt-2 flex gap-2">
  <input ... />
  <button onClick={sendMessage} ...>
    <Send className="h-4 w-4" />
  </button>
</div>
```

Replace it with:
```tsx
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
```

- [ ] **Step 5: Add MicButton to the record mode textarea area**

Find the record mode textarea. Below it (before the error `<p>`), add:
```tsx
<div className="flex justify-end">
  <MicButton
    onTranscript={(text) => setRecordInput((prev) => prev ? prev + " " + text : text)}
    onError={(msg) => setRecordError(msg)}
    disabled={parsing}
    className="text-[#8b7d72] hover:text-[#3d6b2e]"
  />
</div>
```

- [ ] **Step 6: Verify TypeScript**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add components/ai-assistant.tsx && git commit -m "feat(knw-021): integrate MicButton into AI assistant"
```

---

### Task 4: Enable voice button in `app/new-person/page.tsx`

**Files:**
- Modify: `app/new-person/page.tsx`

- [ ] **Step 1: Read the current file**

Read `/Users/sha/Code/AI-code-26/5-konwho/app/new-person/page.tsx`. Find the "语音备注" button block — it currently looks like:

```tsx
<div className="flex items-center gap-2 text-[#8b7d72]">
  <Button
    type="button"
    variant="outline"
    size="sm"
    disabled
    className="gap-1.5 text-[#8b7d72] border-[#d4c9c0]"
  >
    <Mic className="h-4 w-4" />
    语音备注
  </Button>
  <span className="text-xs">即将推出</span>
</div>
```

- [ ] **Step 2: Add MicButton import**

Replace the `Mic` import (from lucide-react) with the MicButton import, or add alongside:
```tsx
import { MicButton } from "@/components/mic-button"
```

Remove `Mic` from the lucide-react import if it's only used in the old button.

- [ ] **Step 3: Add voiceError state**

Inside `NewPersonPage()`, add:
```tsx
const [voiceError, setVoiceError] = useState<string | null>(null)
```

Also add `useEffect` for auto-clearing the error. After the `voiceError` state declaration:
```tsx
useEffect(() => {
  if (!voiceError) return
  const t = setTimeout(() => setVoiceError(null), 3000)
  return () => clearTimeout(t)
}, [voiceError])
```

- [ ] **Step 4: Replace the disabled button block**

Replace the entire "语音备注" div with:
```tsx
<div className="flex items-center gap-2">
  <MicButton
    onTranscript={(text) => {
      const current = (document.getElementById("impression") as HTMLTextAreaElement)?.value ?? ""
      const merged = current ? current + " " + text : text
      // Update via react-hook-form setValue if available, else direct DOM
    }}
    onError={(msg) => setVoiceError(msg)}
    className="flex items-center gap-1.5 rounded-md border border-[#d4c9c0] px-3 py-1.5 text-sm text-[#8b7d72] hover:text-[#3d6b2e] hover:border-[#3d6b2e]"
  />
  <span className="text-xs text-[#8b7d72]">语音备注</span>
</div>
```

Wait — using DOM directly is fragile with react-hook-form. Use `setValue` from `useForm` instead.

Update the `useForm` destructure to include `setValue`:
```tsx
const {
  register,
  handleSubmit,
  setValue,
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

Then the MicButton becomes:
```tsx
<div className="flex items-center gap-2">
  <MicButton
    onTranscript={(text) => {
      setValue("impression", text)
    }}
    onError={(msg) => setVoiceError(msg)}
    className="flex items-center gap-1.5 rounded-md border border-[#d4c9c0] px-3 py-1.5 text-sm text-[#8b7d72] hover:text-[#3d6b2e] hover:border-[#3d6b2e]"
  />
  <span className="text-xs text-[#8b7d72]">语音备注</span>
</div>
```

- [ ] **Step 5: Add voice error display**

Above the form `<form>` tag (below the `apiError` block), add:
```tsx
{voiceError && (
  <div className="mb-4 rounded-lg bg-orange-50 border border-orange-200 px-4 py-3 text-sm text-orange-700">
    {voiceError}
  </div>
)}
```

- [ ] **Step 6: Verify TypeScript**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/new-person/page.tsx && git commit -m "feat(knw-021): enable voice input on new-person page"
```
