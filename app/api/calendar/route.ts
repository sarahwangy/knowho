import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const year = parseInt(searchParams.get("year") ?? "", 10)
  const month = parseInt(searchParams.get("month") ?? "", 10)

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid year or month" }, { status: 400 })
  }

  try {
    const dates = await prisma.importantDate.findMany({
      where: {
        contact: { userId: session.user.id, deletedAt: null },
        month,
      },
      include: {
        contact: { select: { id: true, name: true } },
      },
      orderBy: { day: "asc" },
    })

    const result = dates.map((d) => ({
      contactId: d.contact.id,
      contactName: d.contact.name,
      type: d.type === "自定义" ? (d.label ?? "自定义") : d.type,
      month: d.month,
      day: d.day,
    }))

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
