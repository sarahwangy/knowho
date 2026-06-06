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
