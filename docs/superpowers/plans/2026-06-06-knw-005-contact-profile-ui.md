# KNW-005 — 联系人档案页 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/people/[id]` — a full contact profile page with read-only sections (basic info, tags, impression, important dates, interactions) plus an inline edit sheet and delete action.

**Architecture:** Single Client Component at `app/people/[id]/page.tsx`. On mount it fetches `GET /api/contacts/:id`. The edit sheet is an inline fixed panel (no separate file) sharing the page's state. New tags in the edit flow are created via `POST /api/tags` before `PATCH /api/contacts/:id`.

**Tech Stack:** Next.js App Router · React (useState, useEffect) · react-hook-form · zod · shadcn Input/Textarea/Label/Badge · TagPicker (existing) · lucide-react · Tailwind CSS

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `app/people/[id]/page.tsx` | Create | Contact profile page — view + edit sheet + delete |

---

## Shared types (used across both tasks)

```ts
interface Tag {
  id: string
  name: string
  isPreset: boolean
}

interface ImportantDate {
  id: string
  type: string
  label: string | null
  month: number
  day: number
  year: number | null
  remindDaysBefore: number
}

interface Interaction {
  id: string
  content: string
  date: string
  createdAt: string
}

interface Contact {
  id: string
  name: string
  metAt: string | null
  impression: string | null
  contactFreq: string | null
  tags: Tag[]
  importantDates: ImportantDate[]
  interactions: Interaction[]
}
```

---

## Task 1: View-only page — data fetch, all read sections, back, delete

**Files:**
- Create: `app/people/[id]/page.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Tag {
  id: string
  name: string
  isPreset: boolean
}

interface ImportantDate {
  id: string
  type: string
  label: string | null
  month: number
  day: number
  year: number | null
  remindDaysBefore: number
}

interface Interaction {
  id: string
  content: string
  date: string
  createdAt: string
}

interface Contact {
  id: string
  name: string
  metAt: string | null
  impression: string | null
  contactFreq: string | null
  tags: Tag[]
  importantDates: ImportantDate[]
  interactions: Interaction[]
}

function dateEmoji(type: string) {
  if (type === "生日") return "🎂"
  if (type === "纪念日") return "🗓️"
  return "📌"
}

function formatDate(d: ImportantDate) {
  const label = d.type === "自定义" ? d.label : d.type
  const year = d.year ? `（${d.year}年）` : ""
  return `${dateEmoji(d.type)} ${label} · ${d.month}月${d.day}日${year}`
}

function formatInteractionDate(dateStr: string) {
  return dateStr.slice(0, 10)
}

export default function ContactProfilePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  async function loadContact() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/contacts/${id}`)
      if (!res.ok) {
        setError("加载失败，请返回重试")
        return
      }
      setContact(await res.json())
    } catch {
      setError("加载失败，请返回重试")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadContact()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleDelete() {
    if (!window.confirm("确定删除？此操作不可撤销")) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" })
      if (res.ok) {
        router.push("/people")
      }
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f4f1] p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-16 bg-[#e8e0d8] rounded" />
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-[#e8e0d8]" />
            <div className="space-y-2">
              <div className="h-5 w-24 bg-[#e8e0d8] rounded" />
              <div className="h-3 w-16 bg-[#e8e0d8] rounded" />
            </div>
          </div>
          <div className="h-24 bg-[#e8e0d8] rounded-xl" />
          <div className="h-24 bg-[#e8e0d8] rounded-xl" />
        </div>
      </main>
    )
  }

  if (error || !contact) {
    return (
      <main className="min-h-screen bg-[#f7f4f1] p-5">
        <button
          onClick={() => router.push("/people")}
          className="flex items-center gap-1 text-[#8b7d72] mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </button>
        <p className="text-red-500 text-sm">{error ?? "联系人不存在"}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f7f4f1] flex flex-col pb-20">
      {/* Nav */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <button
          onClick={() => router.push("/people")}
          className="flex items-center gap-1 text-[#8b7d72]"
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </button>
        <button
          onClick={() => setEditOpen(true)}
          className="text-sm text-[#2d2926] font-medium"
        >
          编辑
        </button>
      </div>

      <div className="px-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#d4c9c0] flex items-center justify-center font-bold text-[#2d2926] text-2xl shrink-0">
            {contact.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#2d2926]">{contact.name}</h1>
            {contact.metAt && (
              <p className="text-sm text-[#8b7d72] mt-0.5">{contact.metAt}</p>
            )}
          </div>
        </div>

        {/* Tags */}
        {contact.tags.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {contact.tags.map((tag) => (
                <Badge key={tag.id} variant="outline" className="border-[#e8e0d8] text-[#8b7d72]">
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Impression */}
        {contact.impression && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-[#8b7d72] mb-1">一句话印象</p>
            <p className="text-sm text-[#2d2926]">{contact.impression}</p>
          </div>
        )}

        {/* Important dates */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-[#8b7d72] mb-3">重要日期</p>
          {contact.importantDates.length === 0 ? (
            <p className="text-sm text-[#8b7d72]">暂无重要日期</p>
          ) : (
            <ul className="space-y-2">
              {contact.importantDates.map((d) => (
                <li key={d.id} className="text-sm text-[#2d2926]">
                  {formatDate(d)}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            disabled
            className="mt-3 flex items-center gap-1 text-xs text-[#c0b8b0] cursor-not-allowed"
          >
            <Plus className="h-3 w-3" />
            添加日期
          </button>
        </div>

        {/* Interactions */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-[#8b7d72] mb-3">互动记录</p>
          {contact.interactions.length === 0 ? (
            <p className="text-sm text-[#8b7d72]">还没有互动记录</p>
          ) : (
            <ul className="space-y-3">
              {contact.interactions.map((i) => (
                <li key={i.id}>
                  <p className="text-sm text-[#2d2926]">{i.content}</p>
                  <p className="text-xs text-[#8b7d72] mt-0.5">
                    {formatInteractionDate(i.date)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            disabled
            className="mt-3 flex items-center gap-1 text-xs text-[#c0b8b0] cursor-not-allowed"
          >
            <Plus className="h-3 w-3" />
            记录一次
          </button>
        </div>

        {/* Delete */}
        <div className="pt-4 pb-8 text-center">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm text-red-400 hover:text-red-600 disabled:opacity-50"
          >
            {deleting ? "删除中…" : "删除联系人"}
          </button>
        </div>
      </div>

      {/* Edit sheet placeholder — Task 2 will add this */}
      {editOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setEditOpen(false)}
        />
      )}
    </main>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add "app/people/[id]/page.tsx"
git commit -m "feat(KNW-005): add contact profile page — view and delete"
```

---

## Task 2: Edit sheet — form, TagPicker, PATCH with newTags

**Files:**
- Modify: `app/people/[id]/page.tsx`

**Context:** `POST /api/tags` creates a tag and returns `{ id, name, isPreset }` on 201, or `{ error: "Tag already exists" }` on 409. On 409 we fetch `GET /api/tags` to find the existing id by name. `PATCH /api/contacts/:id` accepts `{ name?, metAt?, impression?, tagIds? }`. TagPicker is at `components/tag-picker.tsx` and exports `TagPicker` and `SelectedTag`.

- [ ] **Step 1: Replace the full file with the complete implementation**

```tsx
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowLeft, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { TagPicker, type SelectedTag } from "@/components/tag-picker"

interface Tag {
  id: string
  name: string
  isPreset: boolean
}

interface ImportantDate {
  id: string
  type: string
  label: string | null
  month: number
  day: number
  year: number | null
  remindDaysBefore: number
}

interface Interaction {
  id: string
  content: string
  date: string
  createdAt: string
}

interface Contact {
  id: string
  name: string
  metAt: string | null
  impression: string | null
  contactFreq: string | null
  tags: Tag[]
  importantDates: ImportantDate[]
  interactions: Interaction[]
}

const editSchema = z.object({
  name: z.string().min(1, "姓名不能为空"),
  metAt: z.string().optional(),
  impression: z.string().optional(),
})

type EditValues = z.infer<typeof editSchema>

function dateEmoji(type: string) {
  if (type === "生日") return "🎂"
  if (type === "纪念日") return "🗓️"
  return "📌"
}

function formatDate(d: ImportantDate) {
  const label = d.type === "自定义" ? d.label : d.type
  const year = d.year ? `（${d.year}年）` : ""
  return `${dateEmoji(d.type)} ${label} · ${d.month}月${d.day}日${year}`
}

function formatInteractionDate(dateStr: string) {
  return dateStr.slice(0, 10)
}

export default function ContactProfilePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editTags, setEditTags] = useState<SelectedTag[]>([])
  const [editError, setEditError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditValues>({ resolver: zodResolver(editSchema) })

  async function loadContact() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/contacts/${id}`)
      if (!res.ok) {
        setError("加载失败，请返回重试")
        return
      }
      const data: Contact = await res.json()
      setContact(data)
    } catch {
      setError("加载失败，请返回重试")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadContact()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function openEdit() {
    if (!contact) return
    reset({
      name: contact.name,
      metAt: contact.metAt ?? "",
      impression: contact.impression ?? "",
    })
    setEditTags(contact.tags.map((t) => ({ id: t.id, name: t.name })))
    setEditError(null)
    setEditOpen(true)
  }

  async function resolveNewTags(newTagNames: string[]): Promise<string[]> {
    const ids: string[] = []
    for (const name of newTagNames) {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (res.status === 201) {
        const tag = await res.json()
        ids.push(tag.id)
      } else if (res.status === 409) {
        // Tag already exists — find its id from the full tag list
        const allTags: Tag[] = await fetch("/api/tags").then((r) => r.json())
        const existing = allTags.find(
          (t) => t.name.toLowerCase() === name.toLowerCase()
        )
        if (existing) ids.push(existing.id)
      }
    }
    return ids
  }

  async function onEditSubmit(data: EditValues) {
    setEditError(null)
    try {
      const existingTagIds = editTags.filter((t) => t.id).map((t) => t.id as string)
      const newTagNames = editTags.filter((t) => !t.id).map((t) => t.name)
      const newTagIds = await resolveNewTags(newTagNames)
      const tagIds = [...existingTagIds, ...newTagIds]

      const res = await fetch(`/api/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          metAt: data.metAt || null,
          impression: data.impression || null,
          tagIds,
        }),
      })

      if (!res.ok) {
        setEditError("保存失败，请重试")
        return
      }

      setEditOpen(false)
      await loadContact()
    } catch {
      setEditError("保存失败，请重试")
    }
  }

  async function handleDelete() {
    if (!window.confirm("确定删除？此操作不可撤销")) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" })
      if (res.ok) router.push("/people")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f4f1] p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-16 bg-[#e8e0d8] rounded" />
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-[#e8e0d8]" />
            <div className="space-y-2">
              <div className="h-5 w-24 bg-[#e8e0d8] rounded" />
              <div className="h-3 w-16 bg-[#e8e0d8] rounded" />
            </div>
          </div>
          <div className="h-24 bg-[#e8e0d8] rounded-xl" />
          <div className="h-24 bg-[#e8e0d8] rounded-xl" />
        </div>
      </main>
    )
  }

  if (error || !contact) {
    return (
      <main className="min-h-screen bg-[#f7f4f1] p-5">
        <button
          onClick={() => router.push("/people")}
          className="flex items-center gap-1 text-[#8b7d72] mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </button>
        <p className="text-red-500 text-sm">{error ?? "联系人不存在"}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f7f4f1] flex flex-col pb-20">
      {/* Nav */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <button
          onClick={() => router.push("/people")}
          className="flex items-center gap-1 text-[#8b7d72]"
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </button>
        <button
          onClick={openEdit}
          className="text-sm text-[#2d2926] font-medium"
        >
          编辑
        </button>
      </div>

      <div className="px-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#d4c9c0] flex items-center justify-center font-bold text-[#2d2926] text-2xl shrink-0">
            {contact.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#2d2926]">{contact.name}</h1>
            {contact.metAt && (
              <p className="text-sm text-[#8b7d72] mt-0.5">{contact.metAt}</p>
            )}
          </div>
        </div>

        {/* Tags */}
        {contact.tags.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {contact.tags.map((tag) => (
                <Badge key={tag.id} variant="outline" className="border-[#e8e0d8] text-[#8b7d72]">
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Impression */}
        {contact.impression && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-[#8b7d72] mb-1">一句话印象</p>
            <p className="text-sm text-[#2d2926]">{contact.impression}</p>
          </div>
        )}

        {/* Important dates */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-[#8b7d72] mb-3">重要日期</p>
          {contact.importantDates.length === 0 ? (
            <p className="text-sm text-[#8b7d72]">暂无重要日期</p>
          ) : (
            <ul className="space-y-2">
              {contact.importantDates.map((d) => (
                <li key={d.id} className="text-sm text-[#2d2926]">
                  {formatDate(d)}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            disabled
            className="mt-3 flex items-center gap-1 text-xs text-[#c0b8b0] cursor-not-allowed"
          >
            <Plus className="h-3 w-3" />
            添加日期
          </button>
        </div>

        {/* Interactions */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-[#8b7d72] mb-3">互动记录</p>
          {contact.interactions.length === 0 ? (
            <p className="text-sm text-[#8b7d72]">还没有互动记录</p>
          ) : (
            <ul className="space-y-3">
              {contact.interactions.map((i) => (
                <li key={i.id}>
                  <p className="text-sm text-[#2d2926]">{i.content}</p>
                  <p className="text-xs text-[#8b7d72] mt-0.5">
                    {formatInteractionDate(i.date)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            disabled
            className="mt-3 flex items-center gap-1 text-xs text-[#c0b8b0] cursor-not-allowed"
          >
            <Plus className="h-3 w-3" />
            记录一次
          </button>
        </div>

        {/* Delete */}
        <div className="pt-4 pb-8 text-center">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm text-red-400 hover:text-red-600 disabled:opacity-50"
          >
            {deleting ? "删除中…" : "删除联系人"}
          </button>
        </div>
      </div>

      {/* Edit sheet */}
      {editOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setEditOpen(false)}
          />
          {/* Sheet */}
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl px-5 pt-5 pb-10 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-[#2d2926]">编辑联系人</h2>
              <button
                onClick={() => setEditOpen(false)}
                className="text-sm text-[#8b7d72]"
              >
                取消
              </button>
            </div>

            {editError && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {editError}
              </div>
            )}

            <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-[#2d2926]">姓名</Label>
                <Input
                  id="edit-name"
                  {...register("name")}
                  className={errors.name ? "border-red-400" : ""}
                />
                {errors.name && (
                  <p className="text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-metAt" className="text-[#2d2926]">认识场合</Label>
                <Input
                  id="edit-metAt"
                  placeholder="读书会、健身房…"
                  {...register("metAt")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-impression" className="text-[#2d2926]">一句话印象</Label>
                <Textarea
                  id="edit-impression"
                  rows={3}
                  {...register("impression")}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[#2d2926]">标签</Label>
                <TagPicker value={editTags} onChange={setEditTags} />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#2d2926] text-white hover:bg-[#3d3533]"
              >
                {isSubmitting ? "保存中…" : "保存"}
              </Button>
            </form>
          </div>
        </>
      )}
    </main>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add "app/people/[id]/page.tsx"
git commit -m "feat(KNW-005): add edit sheet with TagPicker and PATCH support"
```

---

## Task 3: Smoke test in browser

- [ ] **Step 1: Start dev server**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npm run dev
```

- [ ] **Step 2: Verify the following flows**

1. Navigate to `/people` → click a contact card → opens `/people/:id`
2. Profile page shows: name, metAt, tags, impression, dates (with emoji), interactions
3. Skeleton shows briefly during load
4. "编辑" button → edit sheet slides up from bottom
5. Edit sheet pre-fills current values
6. Change name → save → page refreshes with new name
7. Add a new tag → save → tag appears in profile
8. Submit with empty name → inline red error "姓名不能为空"
9. "删除联系人" → confirm dialog → redirects to `/people`
10. Disabled "添加日期" and "记录一次" buttons are grayed out

- [ ] **Step 3: Commit if any fixes needed**

```bash
git add "app/people/[id]/page.tsx"
git commit -m "fix(KNW-005): visual fixes after smoke test"
```

---

## Definition of Done

- [ ] `/people/:id` loads contact from `GET /api/contacts/:id`
- [ ] Skeleton shown during load; error shown on failure
- [ ] Header: avatar initial (56px circle) + name + metAt
- [ ] Tags section (hidden if no tags)
- [ ] Impression section (hidden if empty)
- [ ] Important dates with emoji; empty state + disabled add button
- [ ] Interactions list with date; empty state + disabled add button
- [ ] Delete: confirm dialog → DELETE → redirect to /people
- [ ] Edit sheet: pre-fills, validates name, supports TagPicker, calls PATCH
- [ ] New tags resolved via POST /api/tags (409 → lookup existing)
- [ ] TypeScript clean
