// app/api/export/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const format = searchParams.get("format")
  if (format !== "json" && format !== "csv") {
    return NextResponse.json({ error: "format must be json or csv" }, { status: 400 })
  }

  const userId = session.user.id
  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `knowho-export-${dateStr}.${format}`

  try {
    const contacts = await prisma.contact.findMany({
      where: { userId, deletedAt: null },
      include: {
        tags: { select: { id: true, name: true } },
        interactions: {
          orderBy: { date: "desc" },
          select: { id: true, date: true, content: true },
        },
        importantDates: {
          select: { id: true, type: true, label: true, month: true, day: true, year: true },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    if (format === "json") {
      const payload = {
        exportedAt: new Date().toISOString(),
        contacts: contacts.map((c) => ({
          id: c.id,
          name: c.name,
          metAt: c.metAt ?? null,
          impression: c.impression ?? null,
          contactFreq: c.contactFreq ?? null,
          createdAt: c.createdAt.toISOString(),
          tags: c.tags,
          interactions: c.interactions.map((i) => ({
            id: i.id,
            date: i.date.toISOString(),
            content: i.content ?? null,
          })),
          importantDates: c.importantDates,
        })),
      }
      return new Response(JSON.stringify(payload, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    }

    // CSV
    function csvField(value: string | null | undefined): string {
      const str = value ?? ""
      if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const header = "姓名,认识于,印象,联系频率,标签,最近互动日期,互动次数,重要日期数"
    const rows = contacts.map((c) => {
      const tags = c.tags.map((t) => t.name).join("|")
      const lastInteraction = c.interactions[0]?.date.toISOString().slice(0, 10) ?? ""
      return [
        csvField(c.name),
        csvField(c.metAt),
        csvField(c.impression),
        csvField(c.contactFreq),
        csvField(tags),
        csvField(lastInteraction),
        String(c.interactions.length),
        String(c.importantDates.length),
      ].join(",")
    })

    const csv = [header, ...rows].join("\r\n")
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
