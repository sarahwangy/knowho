# KNW-001 — 添加联系人表单 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the "添加联系人" form page at `/new-person` with name, metAt, impression fields, a reusable TagPicker component, and POST to `/api/contacts` on submit.

**Architecture:** Two files — `components/tag-picker.tsx` (reusable, fetches tags, manages selection) and `app/new-person/page.tsx` (Client Component, react-hook-form + zod for validation, calls POST /api/contacts, redirects on success). The TagPicker state lives outside react-hook-form via `useState` and is merged at submit time.

**Tech Stack:** Next.js App Router · React · react-hook-form · zod · shadcn/ui (Input, Textarea, Label, Badge) · Tailwind CSS · lucide-react

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `package.json` | Modify | Add react-hook-form, @hookform/resolvers |
| `components/ui/input.tsx` | Create (shadcn) | Input component |
| `components/ui/textarea.tsx` | Create (shadcn) | Textarea component |
| `components/ui/label.tsx` | Create (shadcn) | Label component |
| `components/ui/badge.tsx` | Create (shadcn) | Badge component |
| `components/tag-picker.tsx` | Create | Tag multi-select component |
| `app/new-person/page.tsx` | Create | Add contact form page |

---

## Task 1: Install dependencies and shadcn components

**Files:**
- Modify: `package.json`
- Create: `components/ui/input.tsx`, `components/ui/textarea.tsx`, `components/ui/label.tsx`, `components/ui/badge.tsx`

- [ ] **Step 1: Install react-hook-form and resolvers**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho
npm install react-hook-form @hookform/resolvers
```

Expected: packages installed, no errors.

- [ ] **Step 2: Add shadcn UI components**

```bash
npx shadcn add input textarea label badge
```

When prompted "Would you like to use the default configuration?" — press Enter to accept. If prompted about overwriting existing files, accept.

Expected: files created in `components/ui/`.

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no output (no errors).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json components/ui/
git commit -m "chore(KNW-001): add react-hook-form and shadcn input/textarea/label/badge"
```

---

## Task 2: TagPicker component

**Files:**
- Create: `components/tag-picker.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/tag-picker.tsx
"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Tag {
  id: string
  name: string
  isPreset: boolean
}

export interface SelectedTag {
  id?: string
  name: string
}

interface TagPickerProps {
  value: SelectedTag[]
  onChange: (tags: SelectedTag[]) => void
}

export function TagPicker({ value, onChange }: TagPickerProps) {
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [newTagInput, setNewTagInput] = useState("")

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((tags: Tag[]) => setAvailableTags(tags))
      .catch(() => {
        // silent degradation — user can still type new tags
      })
  }, [])

  function isSelected(tag: Tag) {
    return value.some((v) => v.id === tag.id || v.name === tag.name)
  }

  function toggleTag(tag: Tag) {
    if (isSelected(tag)) {
      onChange(value.filter((v) => v.id !== tag.id && v.name !== tag.name))
    } else {
      onChange([...value, { id: tag.id, name: tag.name }])
    }
  }

  function addNewTag() {
    const trimmed = newTagInput.trim()
    if (!trimmed) return
    // Don't add duplicates
    if (value.some((v) => v.name === trimmed)) {
      setNewTagInput("")
      return
    }
    onChange([...value, { name: trimmed }])
    setNewTagInput("")
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      addNewTag()
    }
  }

  return (
    <div className="space-y-3">
      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag)}
            >
              <Badge variant={isSelected(tag) ? "default" : "outline"}>
                {tag.name}
              </Badge>
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          placeholder="添加新标签…"
          value={newTagInput}
          onChange={(e) => setNewTagInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-8 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addNewTag}
          className="h-8 px-2"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/tag-picker.tsx
git commit -m "feat(KNW-001): add TagPicker component"
```

---

## Task 3: Add contact form page

**Files:**
- Create: `app/new-person/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// app/new-person/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { TagPicker, type SelectedTag } from "@/components/tag-picker"
import { Mic } from "lucide-react"

const schema = z.object({
  name: z.string().min(1, "姓名不能为空"),
  metAt: z.string().optional(),
  impression: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function NewPersonPage() {
  const router = useRouter()
  const [selectedTags, setSelectedTags] = useState<SelectedTag[]>([])
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormValues) {
    setApiError(null)

    const tagIds = selectedTags.filter((t) => t.id).map((t) => t.id as string)
    const newTags = selectedTags.filter((t) => !t.id).map((t) => t.name)

    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          metAt: data.metAt || undefined,
          impression: data.impression || undefined,
          tagIds,
          newTags,
        }),
      })

      if (!res.ok) {
        setApiError("好像出了点问题，再试一次？")
        return
      }

      const contact = await res.json()
      router.push(`/people/${contact.id}`)
    } catch {
      setApiError("好像出了点问题，再试一次？")
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f4f1] flex flex-col">
      <div className="flex-1 px-5 pt-8 pb-6 max-w-md mx-auto w-full">
        <h1 className="text-xl font-semibold text-[#2d2926] mb-6">
          认识新朋友了？
        </h1>

        {apiError && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* 姓名 */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-[#2d2926]">
              叫什么名字？
            </Label>
            <Input
              id="name"
              autoFocus
              placeholder="姓名"
              {...register("name")}
              className={errors.name ? "border-red-400" : ""}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* 认识场合 */}
          <div className="space-y-1.5">
            <Label htmlFor="metAt" className="text-[#2d2926]">
              在哪儿认识的？
            </Label>
            <Input
              id="metAt"
              placeholder="读书会、健身房、邻居楼…"
              {...register("metAt")}
            />
          </div>

          {/* 一句话印象 */}
          <div className="space-y-1.5">
            <Label htmlFor="impression" className="text-[#2d2926]">
              让你记住 Ta 的那件事
            </Label>
            <Textarea
              id="impression"
              placeholder="他喜欢骑行，养了一只猫叫豆豆…"
              rows={3}
              {...register("impression")}
            />
          </div>

          {/* 标签 */}
          <div className="space-y-1.5">
            <Label className="text-[#2d2926]">标签</Label>
            <TagPicker value={selectedTags} onChange={setSelectedTags} />
          </div>

          {/* 语音备注占位 */}
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

          {/* 提交 */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#2d2926] text-white hover:bg-[#3d3533]"
          >
            {isSubmitting ? "保存中…" : "记下来"}
          </Button>
        </form>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/new-person/page.tsx
git commit -m "feat(KNW-001): add /new-person page — add contact form"
```

---

## Task 4: Wire up navigation and smoke test in browser

**Files:**
- Modify: `app/people/page.tsx` (add FAB link to /new-person)

- [ ] **Step 1: Add FAB button to people page**

Replace the contents of `app/people/page.tsx` with:

```tsx
// app/people/page.tsx
import { auth } from "@/auth"
import Link from "next/link"
import { Plus } from "lucide-react"

export default async function PeoplePage() {
  const session = await auth()

  return (
    <main className="min-h-screen bg-[#f7f4f1] p-6 relative">
      <p className="text-[#2d2926] font-semibold">
        ✅ 已登录：{session?.user?.email}
      </p>
      <p className="text-sm text-[#8b7d72] mt-2">
        联系人列表页（KNW-004，待实现）
      </p>

      {/* FAB */}
      <Link
        href="/new-person"
        className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-[#2d2926] px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-[#3d3533]"
      >
        <Plus className="h-4 w-4" />
        认识新朋友了？
      </Link>
    </main>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Start dev server and smoke test**

```bash
npm run dev
```

Open `http://localhost:3000` in browser → should redirect to `/people`. Click "认识新朋友了？" FAB → should open form at `/new-person`.

Check:
- 姓名 input is auto-focused
- 标签列表加载显示（8个预设标签）
- 点击标签 badge 可选中/取消（颜色切换）
- 在标签输入框输入"读书组"按 Enter，出现新 badge
- 留空姓名提交 → 红字提示"姓名不能为空"，不提交
- 填入姓名提交 → 跳转（目前跳 `/people/[id]`，会 404，正常）

- [ ] **Step 4: Commit**

```bash
git add app/people/page.tsx
git commit -m "feat(KNW-001): add FAB to /people page linking to /new-person"
```

---

## Definition of Done

- [ ] 依赖已安装，`npm run dev` 无报错
- [ ] `/new-person` 页面打开后姓名自动聚焦
- [ ] 标签列表从 API 加载，点击可选中/取消
- [ ] 新标签可通过输入框 + Enter 添加
- [ ] 空姓名提交显示 inline 错误提示
- [ ] 提交成功后跳转（API 错误显示 error banner）
- [ ] 语音备注按钮显示为灰色 disabled 状态
- [ ] 移动端（375px）布局正常
