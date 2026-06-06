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
