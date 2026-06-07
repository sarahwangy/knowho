# KNW-016 Data Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add JSON and CSV export of all user contact data, triggered from a download button on the contacts list page.

**Architecture:** New `GET /api/export?format=json|csv` route handler that queries all contact data server-side and streams a file download response. Frontend adds a DropdownMenu button (Download icon) to the people page search row that sets `window.location.href` to trigger the download.

**Tech Stack:** Next.js 15 App Router, Prisma 7, NextAuth v5, TypeScript, shadcn/ui DropdownMenu, lucide-react Download icon

---

## File Map

| File | Change |
|------|--------|
| `app/api/export/route.ts` | Create — GET endpoint returning JSON or CSV file download |
| `app/people/page.tsx` | Modify — add export dropdown button to search row |
| `components/ui/dropdown-menu.tsx` | Create — install via shadcn CLI |

---

### Task 1: Install shadcn DropdownMenu component

**Files:**
- Create: `components/ui/dropdown-menu.tsx` (via CLI)

- [ ] **Step 1: Install the DropdownMenu component**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx shadcn@latest add dropdown-menu
```

Expected: `components/ui/dropdown-menu.tsx` created, no errors.

- [ ] **Step 2: Verify the file exists**

```bash
ls /Users/sha/Code/AI-code-26/5-konwho/components/ui/dropdown-menu.tsx
```

Expected: file listed.

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && git add components/ui/dropdown-menu.tsx && git commit -m "chore: add shadcn DropdownMenu component"
```

---

### Task 2: Create GET /api/export endpoint

**Files:**
- Create: `app/api/export/route.ts`

**Context:** Follow the same auth pattern as other route handlers. The `contact` model has fields: `id`, `name`, `metAt`, `impression`, `contactFreq`, `createdAt`, `deletedAt`. The `interaction` model has: `id`, `date`, `type`, `content`. The `importantDate` model has: `id`, `type`, `label`, `month`, `day`, `year`. Tags have `id` and `name`. All queries must filter `deletedAt: null` and scope to `userId`.

- [ ] **Step 1: Create the file with imports, auth, and format validation**

```ts
// app/api/export/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const format = searchParams.get("format")
  if (format !== "json" && format !== "csv") {
    return NextResponse.json({ error: "format must be json or csv" }, { status: 400 })
  }

  const userId = session.user.id
  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `knowho-export-${dateStr}.${format}`

  // ... (next steps)
}
```

- [ ] **Step 2: Add the Prisma query**

Inside the GET handler after the auth/validation block:

```ts
  const contacts = await prisma.contact.findMany({
    where: { userId, deletedAt: null },
    include: {
      tags: { select: { id: true, name: true } },
      interactions: {
        orderBy: { date: "desc" },
        select: { id: true, date: true, type: true, content: true },
      },
      importantDates: {
        select: { id: true, type: true, label: true, month: true, day: true, year: true },
      },
    },
    orderBy: { createdAt: "asc" },
  })
```

- [ ] **Step 3: Add JSON export branch**

After the query:

```ts
  if (format === "json") {
    const payload = {
      exportedAt: new Date().toISOString(),
      contacts: contacts.map((c) => ({
        id: c.id,
        name: c.name,
        metAt: c.metAt ?? null,
        impression: c.impression ?? null,
        contactFreq: c.contactFreq ?? null,
        createdAt: c.createdAt.toISOString(),
        tags: c.tags,
        interactions: c.interactions.map((i) => ({
          id: i.id,
          date: i.date.toISOString(),
          type: i.type ?? null,
          content: i.content ?? null,
        })),
        importantDates: c.importantDates,
      })),
    }
    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  }
```

- [ ] **Step 4: Add CSV export branch**

After the JSON branch, add the CSV branch. Use a helper function to escape CSV fields:

```ts
  // CSV helper: wrap in quotes if the value contains comma, newline, or double-quote
  function csvField(value: string | null | undefined): string {
    const str = value ?? ""
    if (str.includes(",") || str.includes("\n") || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const header = "姓名,认识于,印象,联系频率,标签,最近互动日期,互动次数,重要日期数"
  const rows = contacts.map((c) => {
    const tags = c.tags.map((t) => t.name).join("|")
    const lastInteraction = c.interactions[0]?.date.toISOString().slice(0, 10) ?? ""
    return [
      csvField(c.name),
      csvField(c.metAt),
      csvField(c.impression),
      csvField(c.contactFreq),
      csvField(tags),
      csvField(lastInteraction),
      String(c.interactions.length),
      String(c.importantDates.length),
    ].join(",")
  })

  const csv = [header, ...rows].join("\n")
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && git add app/api/export/route.ts && git commit -m "feat(knw-016): add GET /api/export endpoint for JSON and CSV download"
```

---

### Task 3: Add export dropdown to app/people/page.tsx

**Files:**
- Modify: `app/people/page.tsx`

**Context:** Read the file before editing. The search row currently has a flex container with a search Input and a Select (sort dropdown). Add a Download button with DropdownMenu as the third element in that flex row. The Download icon comes from lucide-react.

- [ ] **Step 1: Add DropdownMenu and Download imports**

Add to existing imports:

```ts
import { Download } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
```

- [ ] **Step 2: Add the export button to the search row JSX**

Find the search row flex container. It currently ends with the Select (sort dropdown). Add the Download DropdownMenu as a third element inside the same flex container, after the Select:

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button
      type="button"
      className="flex h-10 w-10 items-center justify-center rounded-md border border-[#e8e0d8] bg-white text-[#8b7d72] hover:text-[#2d2926] shrink-0"
      aria-label="导出数据"
    >
      <Download className="h-4 w-4" />
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => { window.location.href = "/api/export?format=json" }}>
      导出 JSON
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => { window.location.href = "/api/export?format=csv" }}>
      导出 CSV
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && git add app/people/page.tsx && git commit -m "feat(knw-016): add export JSON/CSV dropdown to contacts list"
```
