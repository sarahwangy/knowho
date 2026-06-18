# KNW-C Calendar Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add event creation from calendar days (3 types: met someone / birthday / important event), plus a large voice input section with animated sound wave at the bottom of the calendar page.

**Architecture:** All changes in `app/calendar/page.tsx` (Client Component). Uses existing API: POST `/api/contacts/:id/dates`, GET `/api/contacts` for contact picker, and existing `MicButton` component for voice. "Met someone" shortcut navigates to `/new-person` with pre-filled date.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, existing `/api/contacts`, `/api/contacts/:id/dates`, `MicButton` component

---

## File Map

| File | Change |
|------|--------|
| `app/calendar/page.tsx` | Add event actions panel + add-event modal + voice section |
| `app/globals.css` | Add sound wave keyframe animation |

---

### Task 1: Add event panel and modal to calendar page

**Files:**
- Modify: `app/calendar/page.tsx`

- [ ] **Step 1: Read the current file**

Read `/Users/sha/Code/AI-code-26/5-konwho/app/calendar/page.tsx`.

- [ ] **Step 2: Add new interfaces and state**

After the existing `CalendarDate` interface, add:

```tsx
interface ContactOption {
  id: string
  name: string
  metAt: string | null
}

type AddEventType = "认识了谁" | "记生日" | "重要事件"
```

Inside `CalendarPage()`, after existing state declarations, add:

```tsx
const [contacts, setContacts] = useState<ContactOption[]>([])
const [addEventType, setAddEventType] = useState<AddEventType | null>(null)
const [contactSearch, setContactSearch] = useState("")
const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
const [eventLabel, setEventLabel] = useState("")
const [addEventYear, setAddEventYear] = useState("")
const [addEventError, setAddEventError] = useState<string | null>(null)
const [addEventSaving, setAddEventSaving] = useState(false)
```

- [ ] **Step 3: Fetch contacts on mount**

After the existing calendar `useEffect`, add a one-time contacts fetch:

```tsx
useEffect(() => {
  fetch("/api/contacts")
    .then((r) => (r.ok ? r.json() : []))
    .then((data) => setContacts(Array.isArray(data) ? data : []))
    .catch(() => {})
}, [])
```

- [ ] **Step 4: Add helper functions**

After the existing `isToday` helper, add:

```tsx
function openAddEvent(type: AddEventType) {
  setAddEventType(type)
  setContactSearch("")
  setSelectedContactId(null)
  setEventLabel("")
  setAddEventYear("")
  setAddEventError(null)
}

function closeAddEvent() {
  setAddEventType(null)
}

async function submitAddEvent() {
  if (!selectedDay) return
  if (addEventType === "认识了谁") {
    // Navigate to new-person with date context
    window.location.href = `/new-person?metAt=${encodeURIComponent(`${year}年${month}月${selectedDay}日认识`)}`
    return
  }
  if (!selectedContactId) {
    setAddEventError("请选择一位联系人")
    return
  }
  if (addEventType === "重要事件" && !eventLabel.trim()) {
    setAddEventError("请填写事件名称")
    return
  }
  setAddEventSaving(true)
  setAddEventError(null)
  try {
    const body = {
      type: addEventType === "记生日" ? "生日" : "自定义",
      label: addEventType === "重要事件" ? eventLabel.trim() : undefined,
      month: selectedDay ? month : month,
      day: selectedDay!,
      year: addEventYear ? parseInt(addEventYear) : undefined,
    }
    const res = await fetch(`/api/contacts/${selectedContactId}/dates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      setAddEventError("保存失败，请重试")
      return
    }
    closeAddEvent()
    // Refresh calendar
    setDates([])
    setLoading(true)
    fetch(`/api/calendar?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((data) => { setDates(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  } catch {
    setAddEventError("保存失败，请重试")
  } finally {
    setAddEventSaving(false)
  }
}
```

- [ ] **Step 5: Update the day cell click handler**

Currently day cells only call `setSelectedDay` when there are events. Change so ANY day is selectable (not just days with events):

Find:
```tsx
onClick={() => events ? setSelectedDay(selected ? null : day) : undefined}
```
Replace with:
```tsx
onClick={() => setSelectedDay(selected ? null : day)}
```

Also update the cell className to show a hover state for all days:
```tsx
className={`flex flex-col items-center py-1.5 rounded-lg transition-colors cursor-pointer ${
  today_ ? "bg-white text-[#3d6b2e] font-bold" :
  selected ? "bg-white/30" : "hover:bg-white/10"
}`}
```

- [ ] **Step 6: Add action panel below the calendar grid**

After the closing `</div>` of the grid section (after the day cells), add an action panel that appears when a day is selected:

```tsx
{/* Action panel */}
{selectedDay !== null && (
  <div className="px-4 mt-4">
    <p className="text-white/80 text-sm mb-3 text-center">
      {month}月{selectedDay}日 · 添加
    </p>
    <div className="grid grid-cols-3 gap-2">
      {(["认识了谁", "记生日", "重要事件"] as AddEventType[]).map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => openAddEvent(type)}
          className="flex flex-col items-center gap-1.5 bg-white/20 hover:bg-white/30 rounded-xl py-3 px-2 transition-colors"
        >
          <span className="text-xl">
            {type === "认识了谁" ? "🤝" : type === "记生日" ? "🎂" : "📌"}
          </span>
          <span className="text-xs text-white font-medium">{type}</span>
        </button>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 7: Add the add-event modal**

After the existing `{/* Bottom sheet for selected day */}` block, add:

```tsx
{/* Add event modal */}
{addEventType !== null && (
  <>
    <div className="fixed inset-0 bg-black/50 z-40" onClick={closeAddEvent} />
    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl px-5 pt-5 pb-6 w-[calc(100%-2rem)] max-w-md max-h-[80vh] overflow-y-auto shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[#2d2926]">
          {addEventType === "认识了谁" ? "🤝" : addEventType === "记生日" ? "🎂" : "📌"} {addEventType}
        </h2>
        <button onClick={closeAddEvent} className="text-sm text-[#8b7d72]">取消</button>
      </div>

      <p className="text-sm text-[#8b7d72] mb-4">{month}月{selectedDay}日</p>

      {addEventError && (
        <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          {addEventError}
        </div>
      )}

      {addEventType === "认识了谁" ? (
        <div className="space-y-3">
          <p className="text-sm text-[#2d2926]">将跳转到添加联系人页面，日期已预填。</p>
          <button
            type="button"
            onClick={submitAddEvent}
            className="w-full bg-[#3d6b2e] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#2d5520] transition-colors"
          >
            去添加联系人
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Contact search */}
          <div>
            <label className="text-xs text-[#8b7d72] mb-1.5 block">选择联系人</label>
            <input
              type="text"
              placeholder="搜索姓名…"
              value={contactSearch}
              onChange={(e) => { setContactSearch(e.target.value); setSelectedContactId(null) }}
              className="w-full rounded-lg border border-[#e8e0d8] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d6b2e]"
            />
            {contactSearch && (
              <div className="mt-1 border border-[#e8e0d8] rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                {contacts
                  .filter((c) => c.name.toLowerCase().includes(contactSearch.toLowerCase()))
                  .slice(0, 8)
                  .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setSelectedContactId(c.id); setContactSearch(c.name) }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-[#f5f5f5] ${selectedContactId === c.id ? "bg-[#e8f5e3] text-[#3d6b2e]" : "text-[#2d2926]"}`}
                    >
                      {c.name}
                    </button>
                  ))}
                {contacts.filter((c) => c.name.toLowerCase().includes(contactSearch.toLowerCase())).length === 0 && (
                  <p className="px-3 py-2 text-sm text-[#8b7d72]">没有找到联系人</p>
                )}
              </div>
            )}
          </div>

          {/* Event label (for 重要事件) */}
          {addEventType === "重要事件" && (
            <div>
              <label className="text-xs text-[#8b7d72] mb-1.5 block">事件名称</label>
              <input
                type="text"
                placeholder="如：相识纪念日"
                value={eventLabel}
                onChange={(e) => setEventLabel(e.target.value)}
                className="w-full rounded-lg border border-[#e8e0d8] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d6b2e]"
              />
            </div>
          )}

          {/* Optional year */}
          <div>
            <label className="text-xs text-[#8b7d72] mb-1.5 block">年份（可选）</label>
            <input
              type="number"
              placeholder="如：1990"
              value={addEventYear}
              onChange={(e) => setAddEventYear(e.target.value)}
              className="w-full rounded-lg border border-[#e8e0d8] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d6b2e]"
            />
          </div>

          <button
            type="button"
            onClick={submitAddEvent}
            disabled={addEventSaving}
            className="w-full bg-[#3d6b2e] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#2d5520] transition-colors disabled:opacity-50"
          >
            {addEventSaving ? "保存中…" : "保存"}
          </button>
        </div>
      )}
    </div>
  </>
)}
```

- [ ] **Step 8: TypeScript check**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

Fix any errors. Common issues: `selectedDay` could be `null` in `submitAddEvent` — guard with `if (!selectedDay) return`.

- [ ] **Step 9: Commit**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && git add app/calendar/page.tsx && git commit -m "feat(calendar): add event panel with 3 types + contact picker modal"
```

---

### Task 2: Voice input section with sound wave animation

**Files:**
- Modify: `app/calendar/page.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Read both files**

Read `app/calendar/page.tsx` (updated from Task 1) and `app/globals.css`.

- [ ] **Step 2: Add sound wave animation to globals.css**

Append to `app/globals.css`:

```css
/* Sound wave bars animation */
@keyframes sound-bar-1 {
  0%, 100% { height: 6px; }
  50% { height: 20px; }
}
@keyframes sound-bar-2 {
  0%, 100% { height: 10px; }
  50% { height: 28px; }
}
@keyframes sound-bar-3 {
  0%, 100% { height: 16px; }
  50% { height: 36px; }
}
@keyframes sound-bar-4 {
  0%, 100% { height: 10px; }
  50% { height: 28px; }
}
@keyframes sound-bar-5 {
  0%, 100% { height: 6px; }
  50% { height: 20px; }
}
```

- [ ] **Step 3: Add voice state and imports to calendar page**

In `app/calendar/page.tsx`, add imports at top:

```tsx
import { MicButton } from "@/components/mic-button"
import { Mic } from "lucide-react"
```

Add voice state inside `CalendarPage()`:

```tsx
const [voiceText, setVoiceText] = useState("")
const [voiceRecording, setVoiceRecording] = useState(false)
```

Note: `MicButton` has its own internal state. We pass `onTranscript` to receive text. We need to know when recording is active to show the wave animation. But `MicButton` doesn't expose recording state externally.

Instead of using `MicButton` for this large-format mic, build the voice section inline using the same pattern but with a larger button — just trigger `MicButton` with a custom className, and rely on the visual state inside `MicButton`.

Actually, simply use `MicButton` with a large custom className. The sound wave animation should show when the mic is in "recording" state, but since that's internal to `MicButton`, we'll use a simpler approach: show static decorative bars below the button always, and let the button itself indicate recording via the `MicOff` icon.

Alternatively, add an `onStateChange` prop to `MicButton` — but that changes a shared component. Instead, use a wrapper with local recording state.

**Simpler approach:** Create the mic interaction inline in the calendar page using the same MediaRecorder logic, but visually larger. Use a `isRecording` boolean state to toggle the wave animation.

Add this state:
```tsx
const [calVoiceRecording, setCalVoiceRecording] = useState(false)
const [calVoiceProcessing, setCalVoiceProcessing] = useState(false)
```

And a `CalendarMic` inner component or just inline logic — use inline to keep it simple.

- [ ] **Step 4: Add the voice section JSX**

At the bottom of the `<main>`, before the closing `</main>` tag, after all the modals/sheets, add:

```tsx
{/* Voice input section */}
<div className="px-4 pb-24 mt-8 flex flex-col items-center gap-4">
  <p className="text-white/70 text-xs">语音添加事件</p>

  {/* Mic button */}
  <div className="relative flex items-center justify-center">
    {/* Sound wave bars — shown when recording */}
    {calVoiceRecording && (
      <div className="absolute flex items-end gap-1" style={{ bottom: "calc(100% + 12px)" }}>
        {[1,2,3,4,5].map((i) => (
          <div
            key={i}
            className="w-1.5 bg-white rounded-full"
            style={{
              animation: `sound-bar-${i} ${0.4 + i * 0.1}s ease-in-out infinite`,
              animationDelay: `${i * 0.08}s`,
            }}
          />
        ))}
      </div>
    )}

    <button
      type="button"
      onClick={async () => {
        if (calVoiceProcessing) return
        if (calVoiceRecording) return // handled by stop
        // Start recording
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4"
          const recorder = new MediaRecorder(stream, { mimeType })
          const chunks: Blob[] = []
          recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
          recorder.onstop = async () => {
            stream.getTracks().forEach((t) => t.stop())
            setCalVoiceRecording(false)
            setCalVoiceProcessing(true)
            const blob = new Blob(chunks, { type: mimeType })
            const formData = new FormData()
            formData.append("audio", blob, "recording.webm")
            try {
              const res = await fetch("/api/voice/transcribe", { method: "POST", body: formData })
              const data = res.ok ? await res.json() : null
              if (data?.text) setVoiceText(data.text)
            } catch {}
            setCalVoiceProcessing(false)
          }
          recorder.start()
          setCalVoiceRecording(true)
          // Auto-stop after 60s
          setTimeout(() => { if (recorder.state === "recording") recorder.stop() }, 60000)
          // Store ref for stop button
          ;(window as unknown as Record<string, unknown>).__calRecorder = recorder
        } catch {
          // microphone denied
        }
      }}
      className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-colors ${
        calVoiceRecording
          ? "bg-red-500 hover:bg-red-600"
          : calVoiceProcessing
          ? "bg-white/30"
          : "bg-white hover:bg-white/90"
      }`}
      aria-label={calVoiceRecording ? "点击停止" : "开始语音输入"}
    >
      <Mic className={`h-7 w-7 ${calVoiceRecording || calVoiceProcessing ? "text-white" : "text-[#3d6b2e]"}`} />
    </button>

    {calVoiceRecording && (
      <button
        type="button"
        onClick={() => {
          const rec = (window as unknown as Record<string, unknown>).__calRecorder as MediaRecorder | undefined
          if (rec && rec.state === "recording") rec.stop()
        }}
        className="absolute -bottom-8 text-xs text-white/70 hover:text-white"
      >
        点击停止
      </button>
    )}
  </div>

  {calVoiceProcessing && (
    <p className="text-white/60 text-xs animate-pulse">转换中…</p>
  )}

  {voiceText && (
    <div className="w-full max-w-sm">
      <textarea
        value={voiceText}
        onChange={(e) => setVoiceText(e.target.value)}
        rows={3}
        className="w-full rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
        placeholder="语音转文字结果…"
      />
      <p className="text-white/50 text-xs mt-1 text-center">可编辑后使用</p>
    </div>
  )}
</div>
```

- [ ] **Step 5: TypeScript check**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

The `window.__calRecorder` cast may produce a TS error — use the cast pattern shown. If there are errors with MediaRecorder types, add `// @ts-expect-error` on those specific lines.

- [ ] **Step 6: Commit**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && git add app/calendar/page.tsx app/globals.css && git commit -m "feat(calendar): voice input section with sound wave animation"
```
