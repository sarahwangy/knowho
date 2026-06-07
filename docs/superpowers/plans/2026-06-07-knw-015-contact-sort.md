# KNW-015 Contact Sort Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add name (A→Z / Z→A) and last-interaction-time sort to the contacts list page.

**Architecture:** Two changes — extend the GET /api/contacts response with a `lastInteractionAt` field (server-side Prisma include + map), then add sort state + UI to the people page (client-side). The shadcn Select component must be installed first as it doesn't exist yet.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma 7, shadcn/ui Select, Tailwind CSS

---

## File Map

| File | Change |
|------|--------|
| `app/api/contacts/route.ts` | Modify — include most-recent interaction date in GET response |
| `app/people/page.tsx` | Modify — add sortBy state, sort logic, sort UI (Select) |
| `components/ui/select.tsx` | Create — install via shadcn CLI |

---

### Task 1: Install shadcn Select component

**Files:**
- Create: `components/ui/select.tsx` (via CLI)

- [ ] **Step 1: Install the Select component**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx shadcn@latest add select
```

Expected: `components/ui/select.tsx` created, no errors.

- [ ] **Step 2: Verify the file exists**

```bash
ls /Users/sha/Code/AI-code-26/5-konwho/components/ui/select.tsx
```

Expected: file listed.

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && git add components/ui/select.tsx && git commit -m "chore: add shadcn Select component"
```

---

### Task 2: Add lastInteractionAt to GET /api/contacts

**Files:**
- Modify: `app/api/contacts/route.ts`

**Context:** The current GET handler does `prisma.contact.findMany` with `include: { tags: ... }`. We need to also include the most recent interaction date. Do NOT change the POST handler — only the GET handler changes.

- [ ] **Step 1: Update the Prisma include to fetch the most recent interaction**

Find the `findMany` call in the GET handler. It currently looks like:

```ts
const contacts = await prisma.contact.findMany({
  where: { ... },
  orderBy: { createdAt: "desc" },
  include: {
    tags: { select: { id: true, name: true, isPreset: true } },
  },
})
```

Change it to:

```ts
const contacts = await prisma.contact.findMany({
  where: {
    userId: session.user.id,
    deletedAt: null,
    ...(tagId ? { tags: { some: { id: tagId } } } : {}),
    ...(search
      ? { name: { contains: search, mode: "insensitive" } }
      : {}),
  },
  orderBy: { createdAt: "desc" },
  include: {
    tags: { select: { id: true, name: true, isPreset: true } },
    interactions: {
      orderBy: { date: "desc" },
      take: 1,
      select: { date: true },
    },
  },
})
```

- [ ] **Step 2: Map the result to include lastInteractionAt and strip the raw interactions array**

Replace the `return NextResponse.json(contacts)` line with:

```ts
return NextResponse.json(
  contacts.map((c) => ({
    ...c,
    lastInteractionAt: c.interactions[0]?.date.toISOString() ?? null,
    interactions: undefined,
  }))
)
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && git add app/api/contacts/route.ts && git commit -m "feat(knw-015): include lastInteractionAt in GET /api/contacts response"
```

---

### Task 3: Add sort UI and logic to app/people/page.tsx

**Files:**
- Modify: `app/people/page.tsx`

**Context:** The page is a Client Component at `/Users/sha/Code/AI-code-26/5-konwho/app/people/page.tsx`. It currently has: search input (row 1), tag filter pills (row 2), contact list. The sort Select goes into row 1 alongside the search input. Read the file before editing.

- [ ] **Step 1: Add the Select import**

At the top of the file, add to the existing imports:

```ts
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
```

- [ ] **Step 2: Update the Contact interface to include lastInteractionAt**

Find the `interface Contact` block and add the new field:

```ts
interface Contact {
  id: string
  name: string
  metAt: string | null
  tags: Tag[]
  lastInteractionAt: string | null
}
```

- [ ] **Step 3: Add the sortBy state**

Inside `PeoplePage`, after the existing state declarations, add:

```ts
const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "interaction">("name-asc")
```

- [ ] **Step 4: Add sort step to filteredContacts useMemo**

Find the `filteredContacts` useMemo. It currently ends with two `.filter()` calls. Add a `.sort()` at the end and add `sortBy` to the dependency array:

```ts
const filteredContacts = useMemo(() => {
  return contacts
    .filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter((c) =>
      activeTagId ? c.tags.some((t) => t.id === activeTagId) : true
    )
    .sort((a, b) => {
      if (sortBy === "name-asc") return a.name.localeCompare(b.name, "zh")
      if (sortBy === "name-desc") return b.name.localeCompare(a.name, "zh")
      // interaction: most recent first, null last
      if (!a.lastInteractionAt && !b.lastInteractionAt) return 0
      if (!a.lastInteractionAt) return 1
      if (!b.lastInteractionAt) return -1
      return new Date(b.lastInteractionAt).getTime() - new Date(a.lastInteractionAt).getTime()
    })
}, [contacts, searchQuery, activeTagId, sortBy])
```

- [ ] **Step 5: Update the search row JSX to include the Select**

Find the search bar div:

```tsx
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
```

Replace it with:

```tsx
<div className="px-5 pt-6 pb-3">
  <div className="flex gap-2">
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8b7d72]" />
      <Input
        placeholder="搜索联系人…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-9 bg-white border-[#e8e0d8]"
      />
    </div>
    <Select value={sortBy} onValueChange={(v) => setSortBy(v as "name-asc" | "name-desc" | "interaction")}>
      <SelectTrigger className="w-[100px] bg-white border-[#e8e0d8] shrink-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="name-asc">名字 A→Z</SelectItem>
        <SelectItem value="name-desc">名字 Z→A</SelectItem>
        <SelectItem value="interaction">最近互动</SelectItem>
      </SelectContent>
    </Select>
  </div>
</div>
```

- [ ] **Step 6: Verify TypeScript**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && git add app/people/page.tsx && git commit -m "feat(knw-015): add sort by name and last interaction to contacts list"
```
