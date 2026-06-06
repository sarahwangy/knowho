# KNW-007 + KNW-009 — 重要日期 & 互动记录 API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement important dates (POST/DELETE) and interaction records (GET/POST/DELETE) APIs as sub-resources of contacts.

**Architecture:** Four new Route Handler files following the established pattern: `auth()` for session, `getOwnedContact()` for ownership verification, zod for body validation, `prisma` from `lib/db.ts`. All return `{ "error": "..." }` on failure. The `DELETE /api/interactions/:id` route verifies ownership via `interaction.contact.userId` join instead of the contact route helper.

**Tech Stack:** Next.js App Router Route Handlers · Prisma 7 · zod · `auth()` from `@/auth`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `app/api/contacts/[id]/dates/route.ts` | Create | `POST /api/contacts/:id/dates` |
| `app/api/contacts/[id]/dates/[dateId]/route.ts` | Create | `DELETE /api/contacts/:id/dates/:dateId` |
| `app/api/contacts/[id]/interactions/route.ts` | Create | `GET + POST /api/contacts/:id/interactions` |
| `app/api/interactions/[id]/route.ts` | Create | `DELETE /api/interactions/:id` |

---

## Task 1: POST /api/contacts/:id/dates — 创建重要日期

**Files:**
- Create: `app/api/contacts/[id]/dates/route.ts`

- [ ] **Step 1: Create the file**

```ts
// app/api/contacts/[id]/dates/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const createDateSchema = z.object({
  type: z.enum(["生日", "纪念日", "自定义"]),
  label: z.string().optional(),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  year: z.number().int().optional(),
  remindDaysBefore: z.union([z.literal(1), z.literal(3), z.literal(7)]).default(3),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: contactId } = await params

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId: session.user.id, deletedAt: null },
  })
  if (!contact) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = createDateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { type, label, month, day, year, remindDaysBefore } = parsed.data

  if (type === "自定义" && !label) {
    return NextResponse.json(
      { error: "label is required for custom type" },
      { status: 400 }
    )
  }

  const importantDate = await prisma.importantDate.create({
    data: { contactId, type, label, month, day, year, remindDaysBefore },
  })

  return NextResponse.json(importantDate, { status: 201 })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Smoke test — unauthenticated**

```bash
curl -s -X POST http://localhost:3000/api/contacts/nonexistent/dates \
  -H "Content-Type: application/json" \
  -d '{"type":"生日","month":8,"day":15}' | jq .
```

Expected: `{"error":"Unauthorized"}`

- [ ] **Step 4: Commit**

```bash
git add "app/api/contacts/[id]/dates/route.ts"
git commit -m "feat(KNW-007): POST /api/contacts/:id/dates — create important date"
```

---

## Task 2: DELETE /api/contacts/:id/dates/:dateId — 删除重要日期

**Files:**
- Create: `app/api/contacts/[id]/dates/[dateId]/route.ts`

- [ ] **Step 1: Create the file**

```ts
// app/api/contacts/[id]/dates/[dateId]/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; dateId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: contactId, dateId } = await params

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId: session.user.id, deletedAt: null },
  })
  if (!contact) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const importantDate = await prisma.importantDate.findFirst({
    where: { id: dateId, contactId },
  })
  if (!importantDate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.importantDate.delete({ where: { id: dateId } })

  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Smoke test — unauthenticated**

```bash
curl -s -X DELETE http://localhost:3000/api/contacts/x/dates/y | jq .
```

Expected: `{"error":"Unauthorized"}`

- [ ] **Step 4: Commit**

```bash
git add "app/api/contacts/[id]/dates/[dateId]/route.ts"
git commit -m "feat(KNW-007): DELETE /api/contacts/:id/dates/:dateId — delete important date"
```

---

## Task 3: GET + POST /api/contacts/:id/interactions — 互动记录列表与创建

**Files:**
- Create: `app/api/contacts/[id]/interactions/route.ts`

- [ ] **Step 1: Create the file**

```ts
// app/api/contacts/[id]/interactions/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

async function getOwnedContact(contactId: string, userId: string) {
  return prisma.contact.findFirst({
    where: { id: contactId, userId, deletedAt: null },
  })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: contactId } = await params

  const contact = await getOwnedContact(contactId, session.user.id)
  if (!contact) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const interactions = await prisma.interaction.findMany({
    where: { contactId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  })

  return NextResponse.json(interactions)
}

const createInteractionSchema = z.object({
  content: z.string().min(1, "content is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: contactId } = await params

  const contact = await getOwnedContact(contactId, session.user.id)
  if (!contact) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = createInteractionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { content, date } = parsed.data

  const interaction = await prisma.interaction.create({
    data: {
      contactId,
      content,
      date: new Date(date),
    },
  })

  return NextResponse.json(interaction, { status: 201 })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Smoke test — unauthenticated GET**

```bash
curl -s http://localhost:3000/api/contacts/nonexistent/interactions | jq .
```

Expected: `{"error":"Unauthorized"}`

- [ ] **Step 4: Commit**

```bash
git add "app/api/contacts/[id]/interactions/route.ts"
git commit -m "feat(KNW-009): GET + POST /api/contacts/:id/interactions"
```

---

## Task 4: DELETE /api/interactions/:id — 删除互动记录

**Files:**
- Create: `app/api/interactions/[id]/route.ts`

- [ ] **Step 1: Create the file**

```ts
// app/api/interactions/[id]/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const interaction = await prisma.interaction.findFirst({
    where: { id },
    include: { contact: { select: { userId: true } } },
  })

  if (!interaction || interaction.contact.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.interaction.delete({ where: { id } })

  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Smoke test — unauthenticated**

```bash
curl -s -X DELETE http://localhost:3000/api/interactions/nonexistent | jq .
```

Expected: `{"error":"Unauthorized"}`

- [ ] **Step 4: Commit**

```bash
git add "app/api/interactions/[id]/route.ts"
git commit -m "feat(KNW-009): DELETE /api/interactions/:id"
```

---

## Task 5: 端到端浏览器验证（已登录）

- [ ] **Step 1: 准备** — 启动 `npm run dev`，登录后复制 `next-auth.session-token`，并通过 `POST /api/contacts` 创建一个测试联系人，记录其 `id` 为 `<CID>`。

- [ ] **Step 2: 创建重要日期**

```bash
curl -s -X POST http://localhost:3000/api/contacts/<CID>/dates \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<TOKEN>" \
  -d '{"type":"生日","month":8,"day":15,"year":1990,"remindDaysBefore":3}' | jq .
```

期望：201 含 `{ id, contactId, type, month, day, year, remindDaysBefore }`，记录 `id` 为 `<DID>`。

- [ ] **Step 3: 自定义类型缺 label 返回 400**

```bash
curl -s -X POST http://localhost:3000/api/contacts/<CID>/dates \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<TOKEN>" \
  -d '{"type":"自定义","month":1,"day":1}' | jq .error
```

期望：`"label is required for custom type"`

- [ ] **Step 4: 删除重要日期**

```bash
curl -s -X DELETE http://localhost:3000/api/contacts/<CID>/dates/<DID> \
  -H "Cookie: next-auth.session-token=<TOKEN>" -o /dev/null -w "%{http_code}"
```

期望：`204`

- [ ] **Step 5: 创建互动记录**

```bash
curl -s -X POST http://localhost:3000/api/contacts/<CID>/interactions \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<TOKEN>" \
  -d '{"content":"她说女儿考上大学了","date":"2026-06-06"}' | jq .
```

期望：201 含 `{ id, contactId, content, date, createdAt }`，记录 `id` 为 `<IID>`。

- [ ] **Step 6: 空 content 返回 400**

```bash
curl -s -X POST http://localhost:3000/api/contacts/<CID>/interactions \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<TOKEN>" \
  -d '{"content":"","date":"2026-06-06"}' | jq .error
```

期望：`"Invalid request body"`

- [ ] **Step 7: GET 互动记录列表**

```bash
curl -s http://localhost:3000/api/contacts/<CID>/interactions \
  -H "Cookie: next-auth.session-token=<TOKEN>" | jq 'length'
```

期望：`1`（上面创建的那条）

- [ ] **Step 8: 删除互动记录**

```bash
curl -s -X DELETE http://localhost:3000/api/interactions/<IID> \
  -H "Cookie: next-auth.session-token=<TOKEN>" -o /dev/null -w "%{http_code}"
```

期望：`204`

- [ ] **Step 9: 确认已删除**

```bash
curl -s http://localhost:3000/api/contacts/<CID>/interactions \
  -H "Cookie: next-auth.session-token=<TOKEN>" | jq 'length'
```

期望：`0`

---

## Definition of Done

- [ ] `POST /api/contacts/:id/dates` 返回 401（未登录）、403（联系人不存在/他人）、400（校验失败/自定义缺label）、201（成功）
- [ ] `DELETE /api/contacts/:id/dates/:dateId` 返回 401、403、204
- [ ] `GET /api/contacts/:id/interactions` 返回 401、403、200 数组（按 date 倒序）
- [ ] `POST /api/contacts/:id/interactions` 返回 401、403、400（content空/date格式错）、201
- [ ] `DELETE /api/interactions/:id` 返回 401、403、204
- [ ] 所有 4 个 commits 在 git log 中
