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
