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

  if (tagIds !== undefined) {
    if (tagIds.length > 0) {
      const ownedTags = await prisma.tag.findMany({
        where: { id: { in: tagIds }, userId },
        select: { id: true },
      })
      if (ownedTags.length !== tagIds.length) {
        return NextResponse.json({ error: "Invalid tagIds" }, { status: 400 })
      }
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
