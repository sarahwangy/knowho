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

  const { count } = await prisma.interaction.deleteMany({
    where: { id, contact: { userId: session.user.id } },
  })

  if (count === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return new NextResponse(null, { status: 204 })
}
