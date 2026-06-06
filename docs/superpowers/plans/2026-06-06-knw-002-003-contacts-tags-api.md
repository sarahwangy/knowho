# KNW-002 + KNW-003 — Contacts & Tags API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `POST /api/contacts` and `GET/POST/DELETE /api/tags` — the core data-layer APIs for creating people and managing tags.

**Architecture:** Three Next.js Route Handler files under `app/api/`. Each handler calls `auth()` for session, validates the request body with zod, and uses the shared `prisma` client from `lib/db.ts`. KNW-003 tags API is implemented first because KNW-002 depends on tag upsert logic.

**Tech Stack:** Next.js App Router Route Handlers · Prisma 7 · zod · `auth()` from `@/auth`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `app/api/tags/route.ts` | Create | `GET /api/tags`, `POST /api/tags` |
| `app/api/tags/[id]/route.ts` | Create | `DELETE /api/tags/:id` |
| `app/api/contacts/route.ts` | Create | `POST /api/contacts` |

---

## Task 1: Install zod

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install zod**

```bash
npm install zod
```

Expected output: `added 1 package` (or similar, no errors).

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add zod for API request validation"
```

---

## Task 2: GET /api/tags — list user's tags

**Files:**
- Create: `app/api/tags/route.ts`

- [ ] **Step 1: Create the file with GET handler**

```ts
// app/api/tags/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tags = await prisma.tag.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isPreset: "desc" }, { name: "asc" }],
    select: { id: true, name: true, isPreset: true },
  })

  return NextResponse.json(tags)
}
```

- [ ] **Step 2: Manual smoke test**

Start the dev server (`npm run dev`), then in a new terminal:

```bash
# Should return 401 (not logged in via curl)
curl -s http://localhost:3000/api/tags | jq .
```

Expected: `{"error":"Unauthorized"}`

- [ ] **Step 3: Commit**

```bash
git add app/api/tags/route.ts
git commit -m "feat(KNW-003): GET /api/tags — list user tags"
```

---

## Task 3: POST /api/tags — create custom tag

**Files:**
- Modify: `app/api/tags/route.ts`

- [ ] **Step 1: Add POST handler to the same file**

Replace the full `app/api/tags/route.ts` with:

```ts
// app/api/tags/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tags = await prisma.tag.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isPreset: "desc" }, { name: "asc" }],
    select: { id: true, name: true, isPreset: true },
  })

  return NextResponse.json(tags)
}

const createTagSchema = z.object({
  name: z.string().min(1, "name is required"),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = createTagSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  const { name } = parsed.data

  try {
    const tag = await prisma.tag.create({
      data: { name, userId: session.user.id, isPreset: false },
      select: { id: true, name: true, isPreset: true },
    })
    return NextResponse.json(tag, { status: 201 })
  } catch (e: unknown) {
    // Unique constraint violation: userId + name already exists
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "Tag already exists" }, { status: 409 })
    }
    throw e
  }
}
```

- [ ] **Step 2: Smoke test — empty name**

```bash
curl -s -X POST http://localhost:3000/api/tags \
  -H "Content-Type: application/json" \
  -d '{"name":""}' | jq .
```

Expected: `{"error":"name is required"}` with status 400.

- [ ] **Step 3: Commit**

```bash
git add app/api/tags/route.ts
git commit -m "feat(KNW-003): POST /api/tags — create custom tag"
```

---

## Task 4: DELETE /api/tags/:id — delete custom tag

**Files:**
- Create: `app/api/tags/[id]/route.ts`

- [ ] **Step 1: Create the file**

```ts
// app/api/tags/[id]/route.ts
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

  const tag = await prisma.tag.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!tag) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (tag.isPreset) {
    return NextResponse.json({ error: "Cannot delete preset tag" }, { status: 403 })
  }

  await prisma.tag.delete({ where: { id } })

  return new NextResponse(null, { status: 204 })
}
```

> **Note:** Prisma's implicit many-to-many (`Tag <-> Contact`) automatically removes the join table rows when the tag is deleted — contacts are not affected.

- [ ] **Step 2: Smoke test — delete non-existent tag**

```bash
curl -s -X DELETE http://localhost:3000/api/tags/nonexistent | jq .
```

Expected: `{"error":"Unauthorized"}` (no session in curl).

- [ ] **Step 3: Commit**

```bash
git add app/api/tags/[id]/route.ts
git commit -m "feat(KNW-003): DELETE /api/tags/:id — delete custom tag"
```

---

## Task 5: POST /api/contacts — create contact

**Files:**
- Create: `app/api/contacts/route.ts`

- [ ] **Step 1: Create the file**

```ts
// app/api/contacts/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

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

  // Verify all provided tagIds belong to this user
  if (tagIds.length > 0) {
    const ownedTags = await prisma.tag.findMany({
      where: { id: { in: tagIds }, userId },
      select: { id: true },
    })
    if (ownedTags.length !== tagIds.length) {
      return NextResponse.json({ error: "Invalid tagIds" }, { status: 400 })
    }
  }

  // Upsert newTags and collect their IDs
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

- [ ] **Step 2: Smoke test — missing name**

```bash
curl -s -X POST http://localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -d '{"metAt":"读书会"}' | jq .
```

Expected: `{"error":"name is required"}` with status 400.

- [ ] **Step 3: Smoke test — unauthenticated**

```bash
curl -s -X POST http://localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -d '{"name":"阿伟"}' | jq .
```

Expected: `{"error":"Unauthorized"}` with status 401.

- [ ] **Step 4: Commit**

```bash
git add app/api/contacts/route.ts
git commit -m "feat(KNW-002): POST /api/contacts — create contact with tags"
```

---

## Task 6: End-to-end browser test (authenticated)

These steps require being logged in via the running dev server.

- [ ] **Step 1: Log in via browser**

Open `http://localhost:3000/login` and sign in with Google.

- [ ] **Step 2: Test GET /api/tags**

Open `http://localhost:3000/api/tags` in the browser.

Expected: JSON array with 8 preset tags (读书会, 健身群, 邻居, 工作, 社群, 家人, 朋友, 其他), all with `"isPreset": true`.

- [ ] **Step 3: Test POST /api/tags via curl with session cookie**

Copy the `next-auth.session-token` cookie from DevTools → Application → Cookies, then:

```bash
curl -s -X POST http://localhost:3000/api/tags \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<your-token>" \
  -d '{"name":"瑜伽班"}' | jq .
```

Expected: `{"id":"...","name":"瑜伽班","isPreset":false}` with status 201.

Run again — expected: `{"error":"Tag already exists"}` with status 409.

- [ ] **Step 4: Test POST /api/contacts via curl with session cookie**

```bash
curl -s -X POST http://localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<your-token>" \
  -d '{"name":"阿伟","metAt":"读书会","impression":"喜欢骑行","newTags":["社群"]}' | jq .
```

Expected: 201 with contact object including `tags: [{"name":"社群",...}]`.

- [ ] **Step 5: Test DELETE /api/tags/:id via curl**

Use the `id` of the "瑜伽班" tag from Step 3:

```bash
curl -s -X DELETE http://localhost:3000/api/tags/<瑜伽班-tag-id> \
  -H "Cookie: next-auth.session-token=<your-token>" -v
```

Expected: HTTP 204, empty body.

Try deleting a preset tag ID:

```bash
curl -s -X DELETE http://localhost:3000/api/tags/<preset-tag-id> \
  -H "Cookie: next-auth.session-token=<your-token>" | jq .
```

Expected: `{"error":"Cannot delete preset tag"}` with status 403.

---

## Definition of Done

- [ ] `GET /api/tags` returns 401 unauthenticated, returns preset tags array when logged in
- [ ] `POST /api/tags` returns 400 on empty name, 409 on duplicate, 201 on success
- [ ] `DELETE /api/tags/:id` returns 403 on preset, 404 on missing/other-user's, 204 on success
- [ ] `POST /api/contacts` returns 401 unauthenticated, 400 on missing name, 400 on foreign tagIds, 201 with full contact+tags on success
- [ ] All 4 commits present in git log
