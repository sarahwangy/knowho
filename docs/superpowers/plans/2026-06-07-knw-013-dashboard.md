# KNW-013 Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dashboard homepage showing contact stats, upcoming important dates, and neglected contacts.

**Architecture:** Three changes — new `GET /api/dashboard` endpoint that aggregates all data server-side; new `app/dashboard/page.tsx` Client Component that fetches and renders it; and `app/page.tsx` redirect updated from `/people` to `/dashboard`.

**Tech Stack:** Next.js 15 App Router, Prisma 7, NextAuth v5, TypeScript, Tailwind CSS, lucide-react

---

## File Map

| File | Change |
|------|--------|
| `app/api/dashboard/route.ts` | Create — GET endpoint returning aggregated dashboard data |
| `app/dashboard/page.tsx` | Create — Dashboard Client Component |
| `app/page.tsx` | Modify — change redirect target to `/dashboard` |

---

### Task 1: Create GET /api/dashboard endpoint

**Files:**
- Create: `app/api/dashboard/route.ts`

**Context:** Follow the exact same auth pattern as other route handlers: `auth()` → check `session?.user?.id` → return 401 if missing. Use `prisma` from `@/lib/db`. Today's date: `const now = new Date()` — use this consistently for all calculations. The `importantDate` model has fields: `id`, `contactId`, `type` ("生日"|"纪念日"|"自定义"), `label` (string|null), `month` (1–12), `day` (1–31), `year` (int|null). The `interaction` model has `contactId`, `date` (DateTime), `createdAt`. The `contact` model has `id`, `name`, `userId`, `deletedAt`.

- [ ] **Step 1: Create the file with imports and auth boilerplate**

```ts
// app/api/dashboard/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const userName = session.user.name ?? ""
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // ... (next steps fill this in)
}
```

- [ ] **Step 2: Count total contacts and this month's interactions**

Add inside the GET handler after the auth block:

```ts
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [totalContacts, thisMonthInteractions] = await Promise.all([
    prisma.contact.count({
      where: { userId, deletedAt: null },
    }),
    prisma.interaction.count({
      where: {
        contact: { userId, deletedAt: null },
        date: { gte: startOfMonth },
      },
    }),
  ])
```

- [ ] **Step 3: Compute upcoming dates (next 30 days)**

Add after the counts:

```ts
  const allDates = await prisma.importantDate.findMany({
    where: { contact: { userId, deletedAt: null } },
    include: { contact: { select: { id: true, name: true } } },
  })

  const upcomingRaw: { contactId: string; contactName: string; type: string; daysUntil: number }[] = []

  for (const d of allDates) {
    const year = today.getFullYear()
    let target = new Date(year, d.month - 1, d.day)
    if (target < today) {
      target = new Date(year + 1, d.month - 1, d.day)
    }
    const daysUntil = Math.ceil((target.getTime() - today.getTime()) / 86400000)
    if (daysUntil <= 30) {
      const type = d.type === "自定义" ? (d.label ?? "自定义") : d.type
      upcomingRaw.push({
        contactId: d.contact.id,
        contactName: d.contact.name,
        type,
        daysUntil,
      })
    }
  }

  upcomingRaw.sort((a, b) => a.daysUntil - b.daysUntil)
  const upcomingDates = upcomingRaw.slice(0, 5)
  const upcomingDatesCount = upcomingRaw.length
```

- [ ] **Step 4: Compute neglected contacts (30+ days no interaction)**

Add after upcoming dates:

```ts
  const contacts = await prisma.contact.findMany({
    where: { userId, deletedAt: null },
    include: {
      interactions: {
        orderBy: { date: "desc" },
        take: 1,
        select: { date: true },
      },
    },
  })

  const neglectedRaw: { id: string; name: string; daysSince: number | null }[] = []

  for (const c of contacts) {
    const last = c.interactions[0]
    if (!last) {
      neglectedRaw.push({ id: c.id, name: c.name, daysSince: null })
    } else {
      const lastDate = new Date(last.date.getFullYear(), last.date.getMonth(), last.date.getDate())
      const daysSince = Math.floor((today.getTime() - lastDate.getTime()) / 86400000)
      if (daysSince > 30) {
        neglectedRaw.push({ id: c.id, name: c.name, daysSince })
      }
    }
  }

  // Sort: highest daysSince first, null last
  neglectedRaw.sort((a, b) => {
    if (a.daysSince === null && b.daysSince === null) return 0
    if (a.daysSince === null) return 1
    if (b.daysSince === null) return -1
    return b.daysSince - a.daysSince
  })
  const neglectedContacts = neglectedRaw.slice(0, 5)
```

- [ ] **Step 5: Return the response**

```ts
  return NextResponse.json({
    userName,
    totalContacts,
    thisMonthInteractions,
    upcomingDatesCount,
    upcomingDates,
    neglectedContacts,
  })
```

- [ ] **Step 6: Verify TypeScript**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && git add app/api/dashboard/route.ts && git commit -m "feat(knw-013): add GET /api/dashboard endpoint"
```

---

### Task 2: Create app/dashboard/page.tsx

**Files:**
- Create: `app/dashboard/page.tsx`

**Context:** Follow the exact same Client Component pattern as `app/people/page.tsx` — `"use client"`, useState + useEffect with AbortController, loading skeleton, error state. For the FAB, copy the exact same button style from `app/people/page.tsx` (fixed bottom-right, `bg-[#2d2926]`, `Plus` icon). For greeting: `now.getHours() < 12 → "早上好"`, `< 18 → "下午好"`, else `"晚上好"`. For date display: `daysUntil === 0 → "今天"`, `=== 1 → "明天"`, else `N天后"`. For neglect display: `daysSince === null → "从未联系"`, else `"N天前"`. Date type emojis: `"生日" → "🎂"`, `"纪念日" → "🗓️"`, else `"📌"`.

- [ ] **Step 1: Create the file with interfaces and component shell**

```tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import Link from "next/link"

interface UpcomingDate {
  contactId: string
  contactName: string
  type: string
  daysUntil: number
}

interface NeglectedContact {
  id: string
  name: string
  daysSince: number | null
}

interface DashboardData {
  userName: string
  totalContacts: number
  thisMonthInteractions: number
  upcomingDatesCount: number
  upcomingDates: UpcomingDate[]
  neglectedContacts: NeglectedContact[]
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return "早上好"
  if (h < 18) return "下午好"
  return "晚上好"
}

function dateEmoji(type: string) {
  if (type === "生日") return "🎂"
  if (type === "纪念日") return "🗓️"
  return "📌"
}

function daysUntilLabel(n: number) {
  if (n === 0) return "今天"
  if (n === 1) return "明天"
  return `${n}天后`
}

function daysSinceLabel(n: number | null) {
  if (n === null) return "从未联系"
  return `${n}天前`
}

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/dashboard", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("failed")
        return r.json()
      })
      .then((d: DashboardData) => {
        setData(d)
        setLoading(false)
      })
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return
        setError("加载失败，请刷新重试")
        setLoading(false)
      })
    return () => controller.abort()
  }, [])

  // ... render below
}
```

- [ ] **Step 2: Add skeleton render**

Inside `DashboardPage`, before the main return, add:

```tsx
  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f4f1] p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-7 w-40 bg-[#e8e0d8] rounded" />
          <div className="h-4 w-24 bg-[#e8e0d8] rounded" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 bg-[#e8e0d8] rounded-xl" />
            <div className="h-16 bg-[#e8e0d8] rounded-xl" />
          </div>
          <div className="h-32 bg-[#e8e0d8] rounded-xl" />
          <div className="h-32 bg-[#e8e0d8] rounded-xl" />
        </div>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#f7f4f1] p-5">
        <p className="text-red-500 text-sm">{error ?? "加载失败"}</p>
      </main>
    )
  }
```

- [ ] **Step 3: Add main render**

After the error state, add the main return:

```tsx
  return (
    <main className="min-h-screen bg-[#f7f4f1] flex flex-col pb-24">
      <div className="px-5 pt-8 pb-4 space-y-4">
        {/* Greeting */}
        <div>
          <h1 className="text-xl font-bold text-[#2d2926]">
            {greeting()}，{data.userName.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-[#8b7d72] mt-0.5">共 {data.totalContacts} 位联系人</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-[#8b7d72] mb-1">本月互动</p>
            <p className="text-2xl font-bold text-[#2d2926]">{data.thisMonthInteractions}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-[#8b7d72] mb-1">近期日期</p>
            <p className="text-2xl font-bold text-[#2d2926]">{data.upcomingDatesCount}</p>
          </div>
        </div>

        {/* Upcoming dates */}
        {data.upcomingDates.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-[#8b7d72] mb-3">即将到来</p>
            <ul className="space-y-3">
              {data.upcomingDates.map((d, i) => (
                <li key={i}>
                  <Link
                    href={`/people/${d.contactId}`}
                    className="flex items-center gap-3"
                  >
                    <span className="text-lg">{dateEmoji(d.type)}</span>
                    <span className="flex-1 text-sm text-[#2d2926]">
                      {d.contactName} · {d.type}
                    </span>
                    <span className="text-xs text-[#8b7d72]">{daysUntilLabel(d.daysUntil)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Neglected contacts */}
        {data.neglectedContacts.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-[#8b7d72] mb-3">久未联系</p>
            <ul className="space-y-3">
              {data.neglectedContacts.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/people/${c.id}`}
                    className="flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#d4c9c0] flex items-center justify-center font-bold text-[#2d2926] text-sm shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <span className="flex-1 text-sm text-[#2d2926]">{c.name}</span>
                    <span className="text-xs text-[#c0b8b0]">{daysSinceLabel(c.daysSince)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Link to people list */}
        <Link
          href="/people"
          className="block text-center text-sm text-[#8b7d72] hover:text-[#2d2926] py-2"
        >
          查看所有联系人 →
        </Link>
      </div>

      {/* FAB */}
      <button
        onClick={() => router.push("/new-person")}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#2d2926] text-white shadow-lg flex items-center justify-center hover:bg-[#3d3533] transition-colors"
        aria-label="添加联系人"
      >
        <Plus className="h-6 w-6" />
      </button>
    </main>
  )
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && git add app/dashboard/page.tsx && git commit -m "feat(knw-013): add dashboard page"
```

---

### Task 3: Update app/page.tsx redirect and smoke test

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Update the redirect**

Current content of `app/page.tsx`:
```ts
// app/page.tsx
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function Home() {
  const session = await auth()
  redirect(session ? "/people" : "/login")
}
```

Replace with:
```ts
// app/page.tsx
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function Home() {
  const session = await auth()
  redirect(session ? "/dashboard" : "/login")
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Smoke test in browser**

Start dev server: `npm run dev`

1. Visit `http://localhost:3000` while logged in → redirects to `/dashboard`
2. Dashboard loads with greeting, stats, sections
3. If you have contacts with upcoming dates within 30 days → "即将到来" card appears
4. If you have contacts with no interaction or last interaction > 30 days → "久未联系" card appears
5. Click a contact row → navigates to profile page
6. Click "查看所有联系人 →" → goes to `/people`
7. Click FAB → goes to `/new-person`
8. Visit `http://localhost:3000` while logged out → redirects to `/login`

- [ ] **Step 4: Commit**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && git add app/page.tsx && git commit -m "feat(knw-013): redirect homepage to dashboard"
```
