# KNW-004 — 联系人列表页 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `app/people/page.tsx` into a full contact list page with search, tag filter, skeleton loading, and empty states.

**Architecture:** Client Component that fetches `GET /api/contacts` and `GET /api/tags` in parallel on mount. Search and tag filtering are applied client-side via `useMemo`. The FAB is preserved. Clicking a contact card navigates to `/people/:id`.

**Tech Stack:** Next.js App Router · React (useState, useEffect, useMemo) · shadcn Badge · lucide-react · Tailwind CSS

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `app/people/page.tsx` | Rewrite | Contact list page (Client Component) |

---

## Task 1: Rewrite `app/people/page.tsx` — contact list with search + tag filter

**Files:**
- Modify: `app/people/page.tsx`

### Types used in this file

```ts
interface Tag {
  id: string
  name: string
  isPreset: boolean
}

interface Contact {
  id: string
  name: string
  metAt: string | null
  tags: Tag[]
}
```

- [ ] **Step 1: Replace the full file contents**

```tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

interface Tag {
  id: string
  name: string
  isPreset: boolean
}

interface Contact {
  id: string
  name: string
  metAt: string | null
  tags: Tag[]
}

export default function PeoplePage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTagId, setActiveTagId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/contacts").then((r) => r.json()),
      fetch("/api/tags").then((r) => r.json()),
    ])
      .then(([contactsData, tagsData]) => {
        setContacts(Array.isArray(contactsData) ? contactsData : [])
        setTags(Array.isArray(tagsData) ? tagsData : [])
      })
      .catch(() => setError("加载失败，请刷新重试"))
      .finally(() => setLoading(false))
  }, [])

  const filteredContacts = useMemo(() => {
    return contacts
      .filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .filter((c) =>
        activeTagId ? c.tags.some((t) => t.id === activeTagId) : true
      )
  }, [contacts, searchQuery, activeTagId])

  function toggleTag(tagId: string) {
    setActiveTagId((prev) => (prev === tagId ? null : tagId))
  }

  function getInitial(name: string) {
    return name.charAt(0)
  }

  return (
    <main className="min-h-screen bg-[#f7f4f1] flex flex-col">
      {/* Search bar */}
      <div className="px-5 pt-6 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8b7d72]" />
          <Input
            placeholder="搜索联系人…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white border-[#e8e0d8]"
          />
        </div>
      </div>

      {/* Tag filter row */}
      {tags.length > 0 && (
        <div className="px-5 pb-3 flex gap-2 overflow-x-auto scrollbar-none">
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              className="shrink-0"
            >
              <Badge variant={activeTagId === tag.id ? "default" : "outline"}>
                {tag.name}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-5 pb-24">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm animate-pulse"
              >
                <div className="w-10 h-10 rounded-full bg-[#e8e0d8]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#e8e0d8] rounded w-1/3" />
                  <div className="h-3 bg-[#e8e0d8] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            {contacts.length === 0 ? (
              <>
                <p className="text-[#2d2926] font-medium mb-2">
                  还没有认识新朋友？
                </p>
                <p className="text-sm text-[#8b7d72] mb-6">
                  遇到有趣的人，先记下来
                </p>
                <Link
                  href="/new-person"
                  className="rounded-full bg-[#2d2926] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#3d3533]"
                >
                  去记第一个人
                </Link>
              </>
            ) : (
              <p className="text-[#8b7d72] text-sm">没有匹配的联系人</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredContacts.map((contact) => (
              <button
                key={contact.id}
                type="button"
                onClick={() => router.push(`/people/${contact.id}`)}
                className="w-full flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <div className="w-10 h-10 rounded-full bg-[#d4c9c0] flex items-center justify-center font-bold text-[#2d2926] text-base shrink-0">
                  {getInitial(contact.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#2d2926] text-sm">
                    {contact.name}
                  </p>
                  {contact.metAt && (
                    <p className="text-xs text-[#8b7d72] mt-0.5 truncate">
                      {contact.metAt}
                    </p>
                  )}
                  {contact.tags.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {contact.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          className="text-xs py-0 px-1.5 border-[#e8e0d8] text-[#8b7d72]"
                        >
                          {tag.name}
                        </Badge>
                      ))}
                      {contact.tags.length > 3 && (
                        <span className="text-xs text-[#8b7d72]">
                          +{contact.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

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
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add app/people/page.tsx
git commit -m "feat(KNW-004): implement contact list page with search and tag filter"
```

---

## Task 2: Smoke test in browser

- [ ] **Step 1: Start dev server**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npm run dev
```

- [ ] **Step 2: Open browser and verify**

Open `http://localhost:3000` — middleware redirects to `/people` when logged in.

Check:
1. Skeleton cards appear briefly during load, then real contacts appear
2. Search input filters contacts by name in real time
3. Tag badges appear above list; clicking one filters contacts; clicking again clears
4. Empty state "还没有认识新朋友？" + "去记第一个人" button when no contacts exist
5. Empty state "没有匹配的联系人" when search/filter yields no results
6. Clicking a contact card navigates to `/people/:id` (404 is expected — KNW-005 not built yet)
7. FAB "认识新朋友了？" is visible at bottom-right

- [ ] **Step 3: Commit smoke test confirmation** (no code changes needed if all pass)

If any visual fix is needed, fix it, then:

```bash
git add app/people/page.tsx
git commit -m "fix(KNW-004): visual fixes after smoke test"
```

---

## Definition of Done

- [ ] `/people` shows contact list loaded from `GET /api/contacts`
- [ ] Skeleton shown during load
- [ ] Search filters by name, real-time
- [ ] Tag filter row from `GET /api/tags`, single-select toggle
- [ ] Empty state for zero contacts (with CTA) and zero filter results
- [ ] Contact card: avatar initial + name + metAt + up to 3 tag badges
- [ ] Card click → `/people/:id`
- [ ] FAB preserved
- [ ] TypeScript clean
