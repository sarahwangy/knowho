# KNW-006 — 联系人查询/更新/删除 API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `GET /api/contacts`, `GET /api/contacts/:id`, `PATCH /api/contacts/:id`, and `DELETE /api/contacts/:id` — the read/update/delete side of the contacts API.

**Architecture:** Two Next.js Route Handler files under `app/api/contacts/`. The existing `route.ts` gains a GET handler. A new `[id]/route.ts` handles all single-contact operations. All routes use `auth()` from `@/auth` and the shared `prisma` from `lib/db.ts`. Ownership is verified via `findFirst({ where: { id, userId, deletedAt: null } })` — returning 403 for any mismatch.

**Tech Stack:** Next.js App Router Route Handlers · Prisma 7 · zod · `auth()` from `@/auth`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `app/api/contacts/route.ts` | Modify | Add `GET /api/contacts` (list with filters) |
| `app/api/contacts/[id]/route.ts` | Create | `GET`, `PATCH`, `DELETE /api/contacts/:id` |

---

## Task 1: GET /api/contacts — list with optional filters

**Files:**
- Modify: `app/api/contacts/route.ts`

- [ ] **Step 1: Add GET handler to the existing file**

Open `app/api/contacts/route.ts` and add the following export **before** the existing `createContactSchema` definition (add at the top after imports, keeping POST intact):

```ts
// app/api/contacts/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const tagId = searchParams.get("tagId") ?? undefined
  const search = searchParams.get("search") ?? undefined

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
    },
  })

  return NextResponse.json(contacts)
}

const createContactSchema = z.object({
  name: z.string().min(1, "name is required"),
  metAt: z.string().optional(),
  impression: z.string().optional(),
  tagIds: z.array(z.string()).optional().default([]),
  newTags: z.array(z.string().min(1)).optional().default([]),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  const body = await request.json().catch(() => null)
  const parsed = createContactSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  const { name, metAt, impression, tagIds, newTags } = parsed.data

  if (tagIds.length > 0) {
    const ownedTags = await prisma.tag.findMany({
      where: { id: { in: tagIds }, userId },
      select: { id: true },
    })
    if (ownedTags.length !== tagIds.length) {
      return NextResponse.json({ error: "Invalid tagIds" }, { status: 400 })
    }
  }

  const upsertedTags = await Promise.all(
    newTags.map((tagName) =>
      prisma.tag.upsert({
        where: { userId_name: { userId, name: tagName } },
        update: {},
        create: { userId, name: tagName, isPreset: false },
        select: { id: true },
      })
    )
  )

  const allTagIds = [
    ...tagIds,
    ...upsertedTags.map((t) => t.id),
  ]

  const contact = await prisma.contact.create({
    data: {
      userId,
      name,
      metAt,
      impression,
      tags: {
        connect: allTagIds.map((id) => ({ id })),
      },
    },
    include: {
      tags: { select: { id: true, name: true, isPreset: true } },
    },
  })

  return NextResponse.json(contact, { status: 201 })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no output (no errors).

- [ ] **Step 3: Smoke test — unauthenticated**

```bash
curl -s http://localhost:3000/api/contacts | jq .
```

Expected: `{"error":"Unauthorized"}`

- [ ] **Step 4: Commit**

```bash
git add app/api/contacts/route.ts
git commit -m "feat(KNW-006): GET /api/contacts — list contacts with tagId/search filters"
```

---

## Task 2: GET /api/contacts/:id — single contact with full nested data

**Files:**
- Create: `app/api/contacts/[id]/route.ts`

- [ ] **Step 1: Create the file**

```ts
// app/api/contacts/[id]/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

async function getOwnedContact(id: string, userId: string) {
  return prisma.contact.findFirst({
    where: { id, userId, deletedAt: null },
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

  const { id } = await params
  const owned = await getOwnedContact(id, session.user.id)
  if (!owned) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      tags: { select: { id: true, name: true, isPreset: true } },
      importantDates: true,
      interactions: {
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      },
    },
  })

  return NextResponse.json(contact)
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Smoke test — unauthenticated**

```bash
curl -s http://localhost:3000/api/contacts/nonexistent | jq .
```

Expected: `{"error":"Unauthorized"}`

- [ ] **Step 4: Commit**

```bash
git add "app/api/contacts/[id]/route.ts"
git commit -m "feat(KNW-006): GET /api/contacts/:id — single contact with tags, dates, interactions"
```

---

## Task 3: PATCH /api/contacts/:id — partial update

**Files:**
- Modify: `app/api/contacts/[id]/route.ts`

- [ ] **Step 1: Add PATCH handler to the file**

Replace the full contents of `app/api/contacts/[id]/route.ts` with:

```ts
// app/api/contacts/[id]/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

async function getOwnedContact(id: string, userId: string) {
  return prisma.contact.findFirst({
    where: { id, userId, deletedAt: null },
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

  const { id } = await params
  const owned = await getOwnedContact(id, session.user.id)
  if (!owned) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      tags: { select: { id: true, name: true, isPreset: true } },
      importantDates: true,
      interactions: {
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      },
    },
  })

  return NextResponse.json(contact)
}

const patchContactSchema = z.object({
  name: z.string().min(1).optional(),
  metAt: z.string().nullable().optional(),
  impression: z.string().nullable().optional(),
  contactFreq: z
    .enum(["每周", "每两周", "每月", "每季度"])
    .nullable()
    .optional(),
  tagIds: z.array(z.string()).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  const { id } = await params
  const owned = await getOwnedContact(id, userId)
  if (!owned) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = patchContactSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { tagIds, ...scalarFields } = parsed.data

  // Verify tagIds belong to this user
  if (tagIds !== undefined && tagIds.length > 0) {
    const ownedTags = await prisma.tag.findMany({
      where: { id: { in: tagIds }, userId },
      select: { id: true },
    })
    if (ownedTags.length !== tagIds.length) {
      return NextResponse.json({ error: "Invalid tagIds" }, { status: 400 })
    }
  }

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      ...scalarFields,
      ...(tagIds !== undefined
        ? { tags: { set: tagIds.map((tid) => ({ id: tid })) } }
        : {}),
    },
    include: {
      tags: { select: { id: true, name: true, isPreset: true } },
    },
  })

  return NextResponse.json(contact)
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Smoke test — unauthenticated**

```bash
curl -s -X PATCH http://localhost:3000/api/contacts/nonexistent \
  -H "Content-Type: application/json" \
  -d '{"name":"test"}' | jq .
```

Expected: `{"error":"Unauthorized"}`

- [ ] **Step 4: Commit**

```bash
git add "app/api/contacts/[id]/route.ts"
git commit -m "feat(KNW-006): PATCH /api/contacts/:id — partial contact update"
```

---

## Task 4: DELETE /api/contacts/:id — soft delete

**Files:**
- Modify: `app/api/contacts/[id]/route.ts`

- [ ] **Step 1: Add DELETE handler — append to end of file**

Add this export at the end of `app/api/contacts/[id]/route.ts`:

```ts
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const owned = await getOwnedContact(id, session.user.id)
  if (!owned) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.contact.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

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
curl -s -X DELETE http://localhost:3000/api/contacts/nonexistent | jq .
```

Expected: `{"error":"Unauthorized"}`

- [ ] **Step 4: Commit**

```bash
git add "app/api/contacts/[id]/route.ts"
git commit -m "feat(KNW-006): DELETE /api/contacts/:id — soft delete"
```

---

## Task 5: 端到端浏览器验证（已登录）

- [ ] **Step 1: 启动开发服务器**

```bash
npm run dev
```

- [ ] **Step 2: 获取 session cookie**

浏览器登录后，从 DevTools → Application → Cookies 复制 `next-auth.session-token`。

- [ ] **Step 3: GET /api/contacts — 列表**

```bash
curl -s http://localhost:3000/api/contacts \
  -H "Cookie: next-auth.session-token=<token>" | jq .
```

期望：JSON 数组，包含之前通过 POST /api/contacts 创建的"阿伟"。

- [ ] **Step 4: GET /api/contacts/:id — 单个**

用上一步返回的 `id`：

```bash
curl -s http://localhost:3000/api/contacts/<contact-id> \
  -H "Cookie: next-auth.session-token=<token>" | jq .
```

期望：完整联系人对象，含 `tags`、`importantDates: []`、`interactions: []`。

- [ ] **Step 5: PATCH /api/contacts/:id — 更新**

```bash
curl -s -X PATCH http://localhost:3000/api/contacts/<contact-id> \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<token>" \
  -d '{"impression":"喜欢骑行和读书"}' | jq .impression
```

期望：`"喜欢骑行和读书"`

- [ ] **Step 6: GET /api/contacts?search=阿 — 搜索**

```bash
curl -s "http://localhost:3000/api/contacts?search=阿" \
  -H "Cookie: next-auth.session-token=<token>" | jq 'length'
```

期望：`1`（匹配"阿伟"）

- [ ] **Step 7: DELETE /api/contacts/:id — 软删除**

```bash
curl -s -X DELETE http://localhost:3000/api/contacts/<contact-id> \
  -H "Cookie: next-auth.session-token=<token>" -v
```

期望：HTTP 204，空 body。

再次 GET 列表：

```bash
curl -s http://localhost:3000/api/contacts \
  -H "Cookie: next-auth.session-token=<token>" | jq 'length'
```

期望：`0`（已软删除，不再出现）

再次 GET 单个：

```bash
curl -s http://localhost:3000/api/contacts/<contact-id> \
  -H "Cookie: next-auth.session-token=<token>" | jq .
```

期望：`{"error":"Forbidden"}`（软删除后不可访问）

---

## Definition of Done

- [ ] `GET /api/contacts` 返回 401（未登录）、空数组（无数据）、联系人列表（有数据），支持 `?tagId` 和 `?search` 过滤
- [ ] `GET /api/contacts/:id` 返回 401（未登录）、403（他人/不存在/已删除）、完整联系人对象
- [ ] `PATCH /api/contacts/:id` 返回 401、403、400（无效 tagIds）、200 更新后对象
- [ ] `DELETE /api/contacts/:id` 返回 401、403、204；删除后列表不再显示，单个返回 403
- [ ] 所有 4 个 commits 在 git log 中
