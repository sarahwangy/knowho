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

  const { count } = await prisma.importantDate.deleteMany({
    where: { id: dateId, contactId },
  })

  if (count === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return new NextResponse(null, { status: 204 })
}
