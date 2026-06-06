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
