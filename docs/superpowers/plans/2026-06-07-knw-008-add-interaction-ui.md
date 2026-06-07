# KNW-008 Add Interaction UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable "记录一次" button in the contact profile page to open a bottom sheet where users can log an interaction (content + date), then reload the contact on success.

**Architecture:** Modify `app/people/[id]/page.tsx` only — add two new state variables (`interactionSheetOpen`, `interactionError`), a second `useForm` instance for the interaction form, and a bottom sheet UI that mirrors the existing edit sheet pattern. On submit, POST to `/api/contacts/:id/interactions` and reload.

**Tech Stack:** Next.js 15 App Router, react-hook-form, zod, shadcn/ui (Input, Textarea, Button, Label), Tailwind CSS

---

## File Map

| File | Change |
|------|--------|
| `app/people/[id]/page.tsx` | Add interaction sheet state, form, submit handler, and sheet UI. Enable "记录一次" button. |

---

### Task 1: Add interaction schema, state, and form instance

**Files:**
- Modify: `app/people/[id]/page.tsx`

**Context:** The file currently has one `useForm` for the edit sheet (named `register`, `handleSubmit`, `reset`, `formState`). We need a second independent `useForm` for the interaction form. The existing edit schema is `editSchema`. The page already imports `z`, `useForm`, `zodResolver`.

- [ ] **Step 1: Add `interactionSchema` after `editSchema` (around line 56)**

Add after the `type EditValues = z.infer<typeof editSchema>` line:

```ts
const interactionSchema = z.object({
  content: z.string().min(1, "内容不能为空"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "请选择有效日期"),
})

type InteractionValues = z.infer<typeof interactionSchema>
```

- [ ] **Step 2: Add two new state variables after the existing `editError` state**

Existing state block ends around line 85:
```ts
const [editError, setEditError] = useState<string | null>(null)
```

Add after it:
```ts
const [interactionSheetOpen, setInteractionSheetOpen] = useState(false)
const [interactionError, setInteractionError] = useState<string | null>(null)
```

- [ ] **Step 3: Add second `useForm` instance for interaction form**

The existing `useForm` call is around line 87–92:
```ts
const {
  register,
  handleSubmit,
  reset,
  formState: { errors, isSubmitting },
} = useForm<EditValues>({ resolver: zodResolver(editSchema) })
```

Add a second `useForm` call after it:
```ts
const {
  register: registerInteraction,
  handleSubmit: handleInteractionSubmit,
  reset: resetInteraction,
  formState: { errors: interactionErrors, isSubmitting: isInteractionSubmitting },
} = useForm<InteractionValues>({ resolver: zodResolver(interactionSchema) })
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add app/people/\[id\]/page.tsx
git commit -m "feat(knw-008): add interaction form schema and state"
```

---

### Task 2: Add `openInteractionSheet` helper and `onInteractionSubmit` handler

**Files:**
- Modify: `app/people/[id]/page.tsx`

**Context:** We need a helper to open the sheet (reset form to today's date default) and a submit handler that POSTs to `/api/contacts/:id/interactions`. The contact `id` comes from `params.id` (already `const id = params.id as string`). The endpoint expects `{ content: string, date: string }` and returns 201 on success.

- [ ] **Step 1: Add `openInteractionSheet` after the `openEdit` function (around line 130)**

```ts
function openInteractionSheet() {
  const today = new Date().toISOString().slice(0, 10)
  resetInteraction({ content: "", date: today })
  setInteractionError(null)
  setInteractionSheetOpen(true)
}
```

- [ ] **Step 2: Add `onInteractionSubmit` after `openInteractionSheet`**

```ts
async function onInteractionSubmit(data: InteractionValues) {
  setInteractionError(null)
  try {
    const res = await fetch(`/api/contacts/${id}/interactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: data.content, date: data.date }),
    })
    if (!res.ok) {
      setInteractionError("记录失败，请重试")
      return
    }
    setInteractionSheetOpen(false)
    await loadContact(new AbortController().signal)
  } catch {
    setInteractionError("记录失败，请重试")
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add app/people/\[id\]/page.tsx
git commit -m "feat(knw-008): add interaction submit handler"
```

---

### Task 3: Enable "记录一次" button and add interaction sheet UI

**Files:**
- Modify: `app/people/[id]/page.tsx`

**Context:** The "记录一次" button is currently at lines 332–339:
```tsx
<button
  type="button"
  disabled
  className="mt-3 flex items-center gap-1 text-xs text-[#c0b8b0] cursor-not-allowed"
>
  <Plus className="h-3 w-3" />
  记录一次
</button>
```

The edit sheet (lines 355–427) is the UI pattern to replicate.

- [ ] **Step 1: Replace the disabled "记录一次" button**

Replace the block at lines 332–339 with:
```tsx
<button
  type="button"
  onClick={openInteractionSheet}
  className="mt-3 flex items-center gap-1 text-xs text-[#8b7d72] hover:text-[#2d2926]"
>
  <Plus className="h-3 w-3" />
  记录一次
</button>
```

- [ ] **Step 2: Add the interaction sheet after the closing `}` of the edit sheet block**

The edit sheet ends at line 427 (`</>`) just before the closing `</main>`. Add the interaction sheet after it (before `</main>`):

```tsx
{/* Interaction sheet */}
{interactionSheetOpen && (
  <>
    <div
      className="fixed inset-0 bg-black/40 z-40"
      onClick={() => setInteractionSheetOpen(false)}
    />
    <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl px-5 pt-5 pb-10 max-h-[85vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-[#2d2926]">记录一次</h2>
        <button
          onClick={() => setInteractionSheetOpen(false)}
          className="text-sm text-[#8b7d72]"
        >
          取消
        </button>
      </div>

      {interactionError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {interactionError}
        </div>
      )}

      <form onSubmit={handleInteractionSubmit(onInteractionSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="interaction-content" className="text-[#2d2926]">内容</Label>
          <Textarea
            id="interaction-content"
            rows={4}
            placeholder="聊了什么、发生了什么…"
            {...registerInteraction("content")}
            className={interactionErrors.content ? "border-red-400" : ""}
          />
          {interactionErrors.content && (
            <p className="text-xs text-red-500">{interactionErrors.content.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="interaction-date" className="text-[#2d2926]">日期</Label>
          <input
            id="interaction-date"
            type="date"
            {...registerInteraction("date")}
            className={`w-full rounded-md border px-3 py-2 text-sm text-[#2d2926] focus:outline-none focus:ring-2 focus:ring-[#2d2926] ${interactionErrors.date ? "border-red-400" : "border-input"}`}
          />
          {interactionErrors.date && (
            <p className="text-xs text-red-500">{interactionErrors.date.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isInteractionSubmitting}
          className="w-full bg-[#2d2926] text-white hover:bg-[#3d3533]"
        >
          {isInteractionSubmitting ? "保存中…" : "记下来"}
        </Button>
      </form>
    </div>
  </>
)}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Smoke test in browser**

Start dev server if not running: `npm run dev`

1. Navigate to a contact profile page (e.g. `http://localhost:3000/people/<id>`)
2. Click "记录一次" — interaction sheet should open from bottom
3. Submit with empty content — should show "内容不能为空"
4. Fill in content, leave date as today, submit — sheet should close and interaction appears in list
5. Click backdrop — sheet should close without saving
6. Open sheet again, submit — verify date field defaults to today

- [ ] **Step 5: Commit**

```bash
git add app/people/\[id\]/page.tsx
git commit -m "feat(knw-008): add interaction sheet UI and enable record button"
```
