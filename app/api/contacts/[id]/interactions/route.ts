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
