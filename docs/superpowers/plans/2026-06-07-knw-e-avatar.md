# KNW-E Avatar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow contacts to have custom avatars — choose from 15 preset emoji "characters" or upload a photo. Avatar is stored as a nullable string in the DB (emoji char or base64 data URL).

**Architecture:**
- Add `avatar String?` to Contact model + run migration
- Update PATCH `/api/contacts/:id` to accept `avatar`
- Create `components/contact-avatar.tsx` — reusable display component
- Create `components/avatar-picker.tsx` — emoji grid + photo upload
- Integrate picker into contact edit form (in `app/people/[id]/page.tsx`)
- Update avatar display across: contact detail, people list, dashboard

**Avatar string format:**
- `null` → show initial letter (existing behavior)
- any single emoji (e.g. `"🦊"`) → render emoji centered in circle
- `"data:image/..."` → render as `<img>` tag

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, Prisma 7

---

## File Map

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `avatar String?` to Contact |
| `app/api/contacts/[id]/route.ts` | Accept `avatar` in PATCH |
| `components/contact-avatar.tsx` | Create — reusable avatar display |
| `components/avatar-picker.tsx` | Create — emoji grid + photo upload |
| `app/people/[id]/page.tsx` | Show avatar, add picker to edit form |
| `app/people/page.tsx` | Use ContactAvatar in list |
| `app/dashboard/page.tsx` | Use ContactAvatar in neglected list |

---

### Task 1: Schema migration + API update

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `app/api/contacts/[id]/route.ts`

- [ ] **Step 1: Add avatar field to schema**

Read `prisma/schema.prisma`. In the `Contact` model, add `avatar String?` after `impression`:

```prisma
model Contact {
  id             String          @id @default(cuid())
  userId         String
  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  name           String
  metAt          String?
  impression     String?
  avatar         String?
  contactFreq    String?
  ...
}
```

- [ ] **Step 2: Run migration**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx prisma migrate dev --name add_contact_avatar
```

Expected: migration created and applied, `avatar` column added to Contact table.

- [ ] **Step 3: Update PATCH schema in API**

Read `app/api/contacts/[id]/route.ts`. In `patchContactSchema`, add:
```ts
avatar: z.string().nullable().optional(),
```

The `avatar` field should be included in `scalarFields` (it's not in the `tagIds` destructure, so it's already included automatically via `...scalarFields`). No other change needed.

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && git add prisma/schema.prisma prisma/migrations/ app/api/contacts/\[id\]/route.ts && git commit -m "feat(avatar): add avatar field to Contact + update PATCH API"
```

---

### Task 2: Create ContactAvatar and AvatarPicker components

**Files:**
- Create: `components/contact-avatar.tsx`
- Create: `components/avatar-picker.tsx`

- [ ] **Step 1: Create components/contact-avatar.tsx**

```tsx
interface ContactAvatarProps {
  name: string
  avatar?: string | null
  size?: "sm" | "md" | "lg"
  className?: string
}

const SIZE_MAP = {
  sm: { outer: "w-10 h-10", text: "text-base", emoji: "text-xl", img: "w-10 h-10" },
  md: { outer: "w-14 h-14", text: "text-2xl", emoji: "text-3xl", img: "w-14 h-14" },
  lg: { outer: "w-20 h-20", text: "text-3xl", emoji: "text-4xl", img: "w-20 h-20" },
}

export function ContactAvatar({ name, avatar, size = "md", className = "" }: ContactAvatarProps) {
  const s = SIZE_MAP[size]

  if (avatar?.startsWith("data:image")) {
    return (
      <div className={`${s.outer} rounded-full overflow-hidden shrink-0 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatar} alt={name} className={`${s.img} object-cover`} />
      </div>
    )
  }

  if (avatar) {
    return (
      <div className={`${s.outer} rounded-full bg-[#d4c9c0] flex items-center justify-center shrink-0 ${className}`}>
        <span className={s.emoji}>{avatar}</span>
      </div>
    )
  }

  return (
    <div className={`${s.outer} rounded-full bg-[#d4c9c0] flex items-center justify-center font-bold text-[#2d2926] shrink-0 ${className} ${s.text}`}>
      {name.charAt(0) || "?"}
    </div>
  )
}
```

- [ ] **Step 2: Create components/avatar-picker.tsx**

```tsx
"use client"

import { useRef } from "react"

const PRESET_AVATARS = [
  "🦊", "🐼", "🦁", "🐯", "🐻", "🐨",
  "🌸", "⭐", "🌙", "🔥", "💎", "🎭",
  "🤖", "👾", "🦄", "🎪",
]

interface AvatarPickerProps {
  current?: string | null
  name: string
  onChange: (avatar: string | null) => void
}

export function AvatarPicker({ current, name, onChange }: AvatarPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert("图片大小不超过 2MB")
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result
      if (typeof result === "string") onChange(result)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#8b7d72]">选择头像</p>

      {/* Preset emoji grid */}
      <div className="grid grid-cols-8 gap-2">
        {/* Reset to initial */}
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-bold text-[#2d2926] bg-[#d4c9c0] transition-colors ${
            !current ? "border-[#3d6b2e]" : "border-transparent hover:border-[#8b7d72]"
          }`}
          title="使用姓名首字"
        >
          {name.charAt(0) || "?"}
        </button>

        {PRESET_AVATARS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onChange(emoji)}
            className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xl transition-colors bg-[#f5f5f5] hover:bg-[#e8f5e3] ${
              current === emoji ? "border-[#3d6b2e]" : "border-transparent hover:border-[#8b7d72]"
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Photo upload */}
      <div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs text-[#3d6b2e] hover:text-[#2d5520] underline underline-offset-2"
        >
          📷 上传照片
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        {current?.startsWith("data:image") && (
          <span className="ml-2 text-xs text-[#8b7d72]">✓ 已上传</span>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && git add components/contact-avatar.tsx components/avatar-picker.tsx && git commit -m "feat(avatar): add ContactAvatar display + AvatarPicker components"
```

---

### Task 3: Integrate avatar across the app

**Files:**
- Modify: `app/people/[id]/page.tsx`
- Modify: `app/people/page.tsx`
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Read all three files**

Read `app/people/[id]/page.tsx`, `app/people/page.tsx`, `app/dashboard/page.tsx`.

- [ ] **Step 2: Update app/people/[id]/page.tsx**

**2a. Add avatar to Contact interface:**
```ts
interface Contact {
  id: string
  name: string
  metAt: string | null
  impression: string | null
  contactFreq: string | null
  avatar: string | null   // ADD THIS
  tags: Tag[]
  importantDates: ImportantDate[]
  interactions: Interaction[]
}
```

**2b. Add avatar state for the edit form:**
After existing state declarations, add:
```tsx
const [editAvatar, setEditAvatar] = useState<string | null>(null)
```

**2c. Initialize editAvatar in openEdit():**
In the `openEdit()` function, add after `setEditTags(...)`:
```tsx
setEditAvatar(contact.avatar ?? null)
```

**2d. Include avatar in PATCH call:**
In `onEditSubmit`, find the `fetch` PATCH call and add `avatar: editAvatar` to the JSON body:
```ts
body: JSON.stringify({
  name: data.name,
  metAt: data.metAt || null,
  impression: data.impression || null,
  contactFreq: data.contactFreq || null,
  tagIds,
  avatar: editAvatar,
}),
```

(Find the existing fetch call in onEditSubmit and update its body.)

**2e. Import components:**
Add to imports:
```tsx
import { ContactAvatar } from "@/components/contact-avatar"
import { AvatarPicker } from "@/components/avatar-picker"
```

**2f. Replace avatar display in the header section:**
Find:
```tsx
<div className="w-14 h-14 rounded-full bg-[#d4c9c0] flex items-center justify-center font-bold text-[#2d2926] text-2xl shrink-0">
  {contact.name.charAt(0)}
</div>
```
Replace with:
```tsx
<ContactAvatar name={contact.name} avatar={contact.avatar} size="md" />
```

**2g. Add AvatarPicker to the edit form:**
In the edit form (inside `{editOpen && ...}`), add the AvatarPicker before the first form field (姓名), after the error div:
```tsx
<AvatarPicker
  current={editAvatar}
  name={contact.name}
  onChange={setEditAvatar}
/>
```

- [ ] **Step 3: Update app/people/page.tsx — contact list avatars**

**3a. Add avatar to Contact interface:**
```ts
interface Contact {
  id: string
  name: string
  metAt: string | null
  avatar: string | null   // ADD THIS
  tags: Tag[]
  lastInteractionAt: string | null
}
```

**3b. Import ContactAvatar:**
```tsx
import { ContactAvatar } from "@/components/contact-avatar"
```

**3c. Replace initial letter div in contact list:**
Find:
```tsx
<div className="w-10 h-10 rounded-full bg-[#d4c9c0] flex items-center justify-center font-bold text-[#2d2926] text-base shrink-0">
  {getInitial(contact.name)}
</div>
```
Replace with:
```tsx
<ContactAvatar name={contact.name} avatar={contact.avatar} size="sm" />
```

- [ ] **Step 4: Update app/dashboard/page.tsx — neglected contacts**

**4a. Add avatar to NeglectedContact interface:**
```ts
interface NeglectedContact {
  id: string
  name: string
  avatar: string | null   // ADD THIS
  daysSince: number | null
}
```

**4b. Import ContactAvatar:**
```tsx
import { ContactAvatar } from "@/components/contact-avatar"
```

**4c. Replace the initial letter circle in the neglected contacts list:**
Find in the JSX the neglected contact avatar (currently shows name.charAt(0) or similar initial in a circle). Replace with:
```tsx
<ContactAvatar name={nc.name} avatar={nc.avatar} size="sm" />
```

Note: Check the dashboard API (`app/api/dashboard/route.ts`) — it may need to include `avatar` in the select. Read that file and add `avatar: true` to the neglected contacts query select.

- [ ] **Step 5: Update dashboard API to include avatar**

Read `app/api/dashboard/route.ts`. Find the neglected contacts query and add `avatar: true` to the select fields so the field is returned.

- [ ] **Step 6: TypeScript check**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

Fix any errors (likely missing `avatar` in API return types or interface mismatches).

- [ ] **Step 7: Commit**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && git add app/people/\[id\]/page.tsx app/people/page.tsx app/dashboard/page.tsx app/api/dashboard/route.ts && git commit -m "feat(avatar): integrate avatar display and picker across app"
```
