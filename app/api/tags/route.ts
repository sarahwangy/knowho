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
