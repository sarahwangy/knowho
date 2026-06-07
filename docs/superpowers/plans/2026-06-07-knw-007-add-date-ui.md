# KNW-007 Add Important Date UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable the "添加日期" button in the contact profile page to open a bottom sheet where users can add an important date (type, optional label, month, day, optional year), then reload on success.

**Architecture:** Modify `app/people/[id]/page.tsx` only — add `dateSchema`, two new state variables (`dateSheetOpen`, `dateError`), a third `useForm` instance with `watch`, two handlers (`openDateSheet`, `onDateSubmit`), enable the button, and render the date sheet UI. Mirrors the existing interaction sheet pattern exactly.

**Tech Stack:** Next.js 15 App Router, react-hook-form, zod, shadcn/ui (Input, Button, Label), Tailwind CSS

---

## File Map

| File | Change |
|------|--------|
| `app/people/[id]/page.tsx` | Add date schema, state, form, handlers, sheet UI. Enable "添加日期" button. |

---

### Task 1: Add date schema, state, and form instance

**Files:**
- Modify: `app/people/[id]/page.tsx`

**Context:** The file already has `editSchema`/`EditValues` and `interactionSchema`/`InteractionValues`. Add `dateSchema`/`DateValues` in the same module-level block. State and form go inside the component, after the existing `interactionError` state and second `useForm`. `ZodIssueCode` is available from `z.ZodIssueCode` — no extra import needed.

- [ ] **Step 1: Read the file**

```bash
cat -n /Users/sha/Code/AI-code-26/5-konwho/app/people/\[id\]/page.tsx | head -120
```

Locate the line after `type InteractionValues = z.infer<typeof interactionSchema>`. Add the date schema immediately after it.

- [ ] **Step 2: Add `dateSchema` and `DateValues` after `type InteractionValues`**

```ts
const dateSchema = z.object({
  type: z.enum(["生日", "纪念日", "自定义"]),
  label: z.string().optional(),
  month: z.string().min(1, "请选择月份"),
  day: z.string().min(1, "请选择日期"),
  year: z.string().optional(),
}).superRefine((val, ctx) => {
  if (val.type === "自定义" && !val.label?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "请填写标签", path: ["label"] })
  }
})

type DateValues = z.infer<typeof dateSchema>
```

- [ ] **Step 3: Add two state variables after `const [interactionError, setInteractionError] = useState<string | null>(null)`**

```ts
const [dateSheetOpen, setDateSheetOpen] = useState(false)
const [dateError, setDateError] = useState<string | null>(null)
```

- [ ] **Step 4: Add third `useForm` instance after the second `useForm` block**

The second useForm ends with `} = useForm<InteractionValues>({ resolver: zodResolver(interactionSchema) })`. Add after it:

```ts
const {
  register: registerDate,
  handleSubmit: handleDateSubmit,
  reset: resetDate,
  watch: watchDate,
  formState: { errors: dateErrors, isSubmitting: isDateSubmitting },
} = useForm<DateValues>({ resolver: zodResolver(dateSchema) })

const watchedDateType = watchDate("type")
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && git add app/people/\[id\]/page.tsx && git commit -m "feat(knw-007): add date form schema and state"
```

---

### Task 2: Add `openDateSheet` and `onDateSubmit` handlers

**Files:**
- Modify: `app/people/[id]/page.tsx`

**Context:** Add both functions inside the component, after `onInteractionSubmit`. The `id` variable comes from `params.id as string`. `loadContact` accepts an optional `AbortSignal`. `resetDate`, `setDateError`, `setDateSheetOpen` are from Task 1.

- [ ] **Step 1: Add `openDateSheet` after `onInteractionSubmit`**

```ts
function openDateSheet() {
  resetDate({ type: "生日", label: "", month: "", day: "", year: "" })
  setDateError(null)
  setDateSheetOpen(true)
}
```

- [ ] **Step 2: Add `onDateSubmit` after `openDateSheet`**

```ts
async function onDateSubmit(data: DateValues) {
  setDateError(null)
  try {
    const body: Record<string, unknown> = {
      type: data.type,
      month: parseInt(data.month),
      day: parseInt(data.day),
      remindDaysBefore: 3,
    }
    if (data.type === "自定义" && data.label) body.label = data.label
    if (data.year) body.year = parseInt(data.year)

    const res = await fetch(`/api/contacts/${id}/dates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      setDateError("添加失败，请重试")
      return
    }
    setDateSheetOpen(false)
    await loadContact(new AbortController().signal)
  } catch {
    setDateError("添加失败，请重试")
  }
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && git add app/people/\[id\]/page.tsx && git commit -m "feat(knw-007): add date submit handler"
```

---

### Task 3: Enable "添加日期" button and add date sheet UI

**Files:**
- Modify: `app/people/[id]/page.tsx`

**Context:** The "添加日期" button is inside the "重要日期" card, currently disabled. The interaction sheet block ends just before `</main>`. Add the date sheet after it.

- [ ] **Step 1: Replace the disabled "添加日期" button**

Find:
```tsx
<button
  type="button"
  disabled
  className="mt-3 flex items-center gap-1 text-xs text-[#c0b8b0] cursor-not-allowed"
>
  <Plus className="h-3 w-3" />
  添加日期
</button>
```

Replace with:
```tsx
<button
  type="button"
  onClick={openDateSheet}
  className="mt-3 flex items-center gap-1 text-xs text-[#8b7d72] hover:text-[#2d2926]"
>
  <Plus className="h-3 w-3" />
  添加日期
</button>
```

- [ ] **Step 2: Add date sheet after the interaction sheet closing `</>` and before `</main>`**

```tsx
      {/* Date sheet */}
      {dateSheetOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setDateSheetOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl px-5 pt-5 pb-10 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-[#2d2926]">添加日期</h2>
              <button
                onClick={() => setDateSheetOpen(false)}
                className="text-sm text-[#8b7d72]"
              >
                取消
              </button>
            </div>

            {dateError && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {dateError}
              </div>
            )}

            <form onSubmit={handleDateSubmit(onDateSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="date-type" className="text-[#2d2926]">类型</Label>
                <select
                  id="date-type"
                  {...registerDate("type")}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm text-[#2d2926] focus:outline-none focus:ring-2 focus:ring-[#2d2926]"
                >
                  <option value="生日">生日</option>
                  <option value="纪念日">纪念日</option>
                  <option value="自定义">自定义</option>
                </select>
              </div>

              {watchedDateType === "自定义" && (
                <div className="space-y-1.5">
                  <Label htmlFor="date-label" className="text-[#2d2926]">标签</Label>
                  <Input
                    id="date-label"
                    placeholder="如：相识纪念日"
                    {...registerDate("label")}
                    className={dateErrors.label ? "border-red-400" : ""}
                  />
                  {dateErrors.label && (
                    <p className="text-xs text-red-500">{dateErrors.label.message}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="date-month" className="text-[#2d2926]">月</Label>
                  <select
                    id="date-month"
                    {...registerDate("month")}
                    className={`w-full rounded-md border px-3 py-2 text-sm text-[#2d2926] focus:outline-none focus:ring-2 focus:ring-[#2d2926] ${dateErrors.month ? "border-red-400" : "border-input"}`}
                  >
                    <option value="">请选择</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={String(m)}>{m}月</option>
                    ))}
                  </select>
                  {dateErrors.month && (
                    <p className="text-xs text-red-500">{dateErrors.month.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="date-day" className="text-[#2d2926]">日</Label>
                  <select
                    id="date-day"
                    {...registerDate("day")}
                    className={`w-full rounded-md border px-3 py-2 text-sm text-[#2d2926] focus:outline-none focus:ring-2 focus:ring-[#2d2926] ${dateErrors.day ? "border-red-400" : "border-input"}`}
                  >
                    <option value="">请选择</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={String(d)}>{d}日</option>
                    ))}
                  </select>
                  {dateErrors.day && (
                    <p className="text-xs text-red-500">{dateErrors.day.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="date-year" className="text-[#2d2926]">年份（可选）</Label>
                <input
                  id="date-year"
                  type="number"
                  placeholder="如：1990"
                  {...registerDate("year")}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm text-[#2d2926] focus:outline-none focus:ring-2 focus:ring-[#2d2926]"
                />
              </div>

              <Button
                type="submit"
                disabled={isDateSubmitting}
                className="w-full bg-[#2d2926] text-white hover:bg-[#3d3533]"
              >
                {isDateSubmitting ? "添加中…" : "添加"}
              </Button>
            </form>
          </div>
        </>
      )}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Smoke test in browser**

Start dev server if not running: `npm run dev`

1. Navigate to a contact profile (`http://localhost:3000/people/<id>`)
2. Click "添加日期" — date sheet opens from bottom
3. Submit with month/day empty — shows "请选择月份" / "请选择日期"
4. Select type "自定义", leave label empty, submit — shows "请填写标签"
5. Fill in type "生日", month "8", day "15", submit — sheet closes, date appears in list with 🎂
6. Open again, pick "自定义", fill label "相识纪念日", month "3", day "1", year "2020", submit — appears with 📌 and （2020年）
7. Click backdrop — sheet closes without saving

- [ ] **Step 5: Commit**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && git add app/people/\[id\]/page.tsx && git commit -m "feat(knw-007): add date sheet UI and enable add date button"
```
