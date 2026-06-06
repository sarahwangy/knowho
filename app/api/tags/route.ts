// app/api/tags/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

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

const createTagSchema = z.object({
  name: z.string().min(1, "name is required"),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = createTagSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  const { name } = parsed.data

  try {
    const tag = await prisma.tag.create({
      data: { name, userId: session.user.id, isPreset: false },
      select: { id: true, name: true, isPreset: true },
    })
    return NextResponse.json(tag, { status: 201 })
  } catch (e: unknown) {
    // Unique constraint violation: userId + name already exists
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "Tag already exists" }, { status: 409 })
    }
    throw e
  }
}
