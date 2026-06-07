# KNW-011 Delete Important Date UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a delete button to each important date in the contact profile page, with confirmation dialog and error handling.

**Architecture:** Modify `app/people/[id]/page.tsx` only — add `deletingDateId` state, a `handleDeleteDate` async handler, and update the important dates list JSX to show a `Trash2` icon button per row. `Trash2` is already imported from KNW-010.

**Tech Stack:** Next.js 15 App Router, lucide-react (Trash2 already imported), Tailwind CSS

---

## File Map

| File | Change |
|------|--------|
| `app/people/[id]/page.tsx` | Add state + handler + per-row delete button on dates list |

---

### Task 1: Add delete state, handler, and per-row delete button for dates

**Files:**
- Modify: `app/people/[id]/page.tsx`

**Context:** Read the file first. `Trash2` is already imported (added in KNW-010). Key locations:
- State block: add `deletingDateId` after `const [deletingInteractionId, setDeletingInteractionId] = useState<string | null>(null)`
- Handler: add `handleDeleteDate` after `handleDeleteInteraction`
- JSX: the important dates `<ul>` inside the "重要日期" card — each `<li>` currently renders `{formatDate(d)}` as plain text; update to flex layout with delete button

The DELETE endpoint is `DELETE /api/contacts/${id}/dates/${dateId}` where `id` is the contact ID (already in scope) and `dateId` is `d.id` from the `ImportantDate` interface. Returns 204 on success.

- [ ] **Step 1: Add `deletingDateId` state after `deletingInteractionId`**

```ts
const [deletingDateId, setDeletingDateId] = useState<string | null>(null)
```

- [ ] **Step 2: Add `handleDeleteDate` after `handleDeleteInteraction`**

```ts
async function handleDeleteDate(dateId: string) {
  if (!window.confirm("确定删除这个日期？")) return
  setDeletingDateId(dateId)
  try {
    const res = await fetch(`/api/contacts/${id}/dates/${dateId}`, { method: "DELETE" })
    if (res.ok) {
      await loadContact(new AbortController().signal)
    } else {
      setError("删除失败，请重试")
    }
  } finally {
    setDeletingDateId(null)
  }
}
```

- [ ] **Step 3: Update the important dates `<ul>` to show a delete button per row**

Find the current dates list JSX (inside the "重要日期" card):
```tsx
<ul className="space-y-2">
  {contact.importantDates.map((d) => (
    <li key={d.id} className="text-sm text-[#2d2926]">
      {formatDate(d)}
    </li>
  ))}
</ul>
```

Replace with:
```tsx
<ul className="space-y-2">
  {contact.importantDates.map((d) => (
    <li key={d.id} className="flex items-center justify-between gap-2">
      <span className="text-sm text-[#2d2926] flex-1 min-w-0">{formatDate(d)}</span>
      <button
        type="button"
        onClick={() => handleDeleteDate(d.id)}
        disabled={deletingDateId !== null}
        className="shrink-0 text-[#c0b8b0] hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  ))}
</ul>
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Smoke test in browser**

Start dev server: `npm run dev`

1. Navigate to a contact with at least one important date (`http://localhost:3000/people/<id>`)
2. Each date row should show a `Trash2` icon on the right
3. Click icon → confirm dialog in Chinese appears
4. Cancel → nothing changes
5. Confirm → row disappears, list refreshes
6. Add a new date (KNW-007), then delete it → works correctly

- [ ] **Step 6: Commit**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && git add app/people/\[id\]/page.tsx && git commit -m "feat(knw-011): add delete button to important dates"
```
