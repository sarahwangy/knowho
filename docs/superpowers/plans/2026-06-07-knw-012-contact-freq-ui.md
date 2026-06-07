# KNW-012 Contact Frequency UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a contact frequency field to the edit sheet and display it on the profile page header.

**Architecture:** Modify `app/people/[id]/page.tsx` only — extend `editSchema` with `contactFreq`, update `openEdit` reset, add `contactFreq` to PATCH body in `onEditSubmit`, add a select field in the edit sheet JSX, and display the frequency in the profile header.

**Tech Stack:** Next.js 15 App Router, react-hook-form, zod, shadcn/ui (Label), Tailwind CSS

---

## File Map

| File | Change |
|------|--------|
| `app/people/[id]/page.tsx` | Schema + openEdit + onEditSubmit + edit sheet JSX + header display |

---

### Task 1: Extend schema, openEdit, onEditSubmit, and add select to edit sheet

**Files:**
- Modify: `app/people/[id]/page.tsx`

**Context:** Read the file first. Current state:
- `editSchema` (line ~50): has `name`, `metAt`, `impression` — add `contactFreq`
- `openEdit` (line ~164): calls `reset({ name, metAt, impression })` — add `contactFreq`
- `onEditSubmit` (line ~261): PATCH body has `name`, `metAt`, `impression`, `tagIds` — add `contactFreq`
- Edit sheet form (line ~535): after the impression Textarea block, before the TagPicker block — insert contactFreq select
- Header (line ~398): after `contact.metAt` display — add `contact.contactFreq` display

- [ ] **Step 1: Add `contactFreq` to `editSchema`**

Current `editSchema`:
```ts
const editSchema = z.object({
  name: z.string().min(1, "姓名不能为空"),
  metAt: z.string().optional(),
  impression: z.string().optional(),
})
```

Replace with:
```ts
const editSchema = z.object({
  name: z.string().min(1, "姓名不能为空"),
  metAt: z.string().optional(),
  impression: z.string().optional(),
  contactFreq: z.string().optional(),
})
```

- [ ] **Step 2: Add `contactFreq` to `openEdit` reset call**

Current reset call inside `openEdit`:
```ts
reset({
  name: contact.name,
  metAt: contact.metAt ?? "",
  impression: contact.impression ?? "",
})
```

Replace with:
```ts
reset({
  name: contact.name,
  metAt: contact.metAt ?? "",
  impression: contact.impression ?? "",
  contactFreq: contact.contactFreq ?? "",
})
```

- [ ] **Step 3: Add `contactFreq` to the PATCH body in `onEditSubmit`**

Current PATCH body:
```ts
body: JSON.stringify({
  name: data.name,
  metAt: data.metAt || null,
  impression: data.impression || null,
  tagIds,
}),
```

Replace with:
```ts
body: JSON.stringify({
  name: data.name,
  metAt: data.metAt || null,
  impression: data.impression || null,
  contactFreq: data.contactFreq || null,
  tagIds,
}),
```

- [ ] **Step 4: Add contactFreq select to edit sheet form**

Find the block between the impression field and TagPicker (around line 564):
```tsx
              </div>

              <div className="space-y-1.5">
                <Label className="text-[#2d2926]">标签</Label>
                <TagPicker value={editTags} onChange={setEditTags} />
              </div>
```

Replace with:
```tsx
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-contactFreq" className="text-[#2d2926]">联系频率</Label>
                <select
                  id="edit-contactFreq"
                  {...register("contactFreq")}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm text-[#2d2926] focus:outline-none focus:ring-2 focus:ring-[#2d2926]"
                >
                  <option value="">无</option>
                  <option value="每周">每周</option>
                  <option value="每两周">每两周</option>
                  <option value="每月">每月</option>
                  <option value="每季度">每季度</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[#2d2926]">标签</Label>
                <TagPicker value={editTags} onChange={setEditTags} />
              </div>
```

- [ ] **Step 5: Add contactFreq display in profile header**

Find (around line 398):
```tsx
            {contact.metAt && (
              <p className="text-sm text-[#8b7d72] mt-0.5">{contact.metAt}</p>
            )}
```

Replace with:
```tsx
            {contact.metAt && (
              <p className="text-sm text-[#8b7d72] mt-0.5">{contact.metAt}</p>
            )}
            {contact.contactFreq && (
              <p className="text-xs text-[#8b7d72] mt-0.5">🔁 {contact.contactFreq}联系</p>
            )}
```

- [ ] **Step 6: Verify TypeScript**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Smoke test in browser**

Start dev server: `npm run dev`

1. Navigate to a contact profile (`http://localhost:3000/people/<id>`)
2. Click "编辑" → edit sheet opens
3. "联系频率" select is visible between impression and 标签 fields
4. Select "每月", save → header shows "🔁 每月联系" below metAt
5. Open edit again → "联系频率" select shows "每月" pre-selected
6. Change to "无", save → header no longer shows frequency

- [ ] **Step 8: Commit**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && git add app/people/\[id\]/page.tsx && git commit -m "feat(knw-012): add contact frequency field to edit sheet and profile header"
```
