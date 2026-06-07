# KNW-010 Delete Interaction UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a delete button to each interaction record in the contact profile page, with confirmation dialog and error handling.

**Architecture:** Modify `app/people/[id]/page.tsx` only — add `deletingInteractionId` state, a `handleDeleteInteraction` async handler, and update the interactions list JSX to show a `Trash2` icon button per row.

**Tech Stack:** Next.js 15 App Router, lucide-react (Trash2), Tailwind CSS

---

## File Map

| File | Change |
|------|--------|
| `app/people/[id]/page.tsx` | Add state + handler + per-row delete button |

---

### Task 1: Add delete state, handler, and per-row delete button

**Files:**
- Modify: `app/people/[id]/page.tsx`

**Context:** Read the file first. Key locations:
- Imports: `Trash2` needs to be added to the `lucide-react` import (currently imports `ArrowLeft, Plus`)
- State block: add `deletingInteractionId` after `const [deleting, setDeleting] = useState(false)`
- Handler: add `handleDeleteInteraction` after `handleDelete`
- JSX: the interactions `<ul>` around line 370 — each `<li>` needs flex layout with delete button on the right

The DELETE endpoint is `DELETE /api/interactions/:interactionId` (returns 204 on success, 403 if not found/unauthorized). The `id` in scope is the **contact** id; the interaction's own `id` is `i.id`.

- [ ] **Step 1: Add `Trash2` to the lucide-react import**

Current import line:
```ts
import { ArrowLeft, Plus } from "lucide-react"
```

Replace with:
```ts
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
```

- [ ] **Step 2: Add `deletingInteractionId` state after `const [deleting, setDeleting] = useState(false)`**

```ts
const [deletingInteractionId, setDeletingInteractionId] = useState<string | null>(null)
```

- [ ] **Step 3: Add `handleDeleteInteraction` after the `handleDelete` function**

```ts
async function handleDeleteInteraction(interactionId: string) {
  if (!window.confirm("确定删除这条互动记录？")) return
  setDeletingInteractionId(interactionId)
  try {
    const res = await fetch(`/api/interactions/${interactionId}`, { method: "DELETE" })
    if (res.ok) {
      await loadContact(new AbortController().signal)
    } else {
      setError("删除失败，请重试")
    }
  } finally {
    setDeletingInteractionId(null)
  }
}
```

- [ ] **Step 4: Update the interactions `<ul>` to show a delete button per row**

Find the current interactions list JSX (inside the "互动记录" card):
```tsx
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
```

Replace with:
```tsx
<ul className="space-y-3">
  {contact.interactions.map((i) => (
    <li key={i.id} className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#2d2926]">{i.content}</p>
        <p className="text-xs text-[#8b7d72] mt-0.5">
          {formatInteractionDate(i.date)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => handleDeleteInteraction(i.id)}
        disabled={deletingInteractionId === i.id}
        className="shrink-0 mt-0.5 text-[#c0b8b0] hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  ))}
</ul>
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Smoke test in browser**

Start dev server: `npm run dev`

1. Navigate to a contact with at least one interaction (`http://localhost:3000/people/<id>`)
2. Each interaction row should show a `Trash2` icon on the right
3. Click icon → `window.confirm` dialog appears
4. Cancel → nothing changes
5. Confirm → row disappears, list refreshes
6. Add a new interaction (KNW-008), then delete it → works correctly

- [ ] **Step 7: Commit**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && git add app/people/\[id\]/page.tsx && git commit -m "feat(knw-010): add delete button to interaction records"
```
