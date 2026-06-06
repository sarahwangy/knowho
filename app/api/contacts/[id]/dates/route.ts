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
