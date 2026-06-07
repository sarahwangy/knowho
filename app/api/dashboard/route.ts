import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const userName = session.user.name ?? ""
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [totalContacts, thisMonthInteractions] = await Promise.all([
    prisma.contact.count({
      where: { userId, deletedAt: null },
    }),
    prisma.interaction.count({
      where: {
        contact: { userId, deletedAt: null },
        date: { gte: startOfMonth },
      },
    }),
  ])

  const allDates = await prisma.importantDate.findMany({
    where: { contact: { userId, deletedAt: null } },
    include: { contact: { select: { id: true, name: true } } },
  })

  const upcomingRaw: { contactId: string; contactName: string; type: string; daysUntil: number }[] = []

  for (const d of allDates) {
    const year = today.getFullYear()
    let target = new Date(year, d.month - 1, d.day)
    if (target < today) {
      target = new Date(year + 1, d.month - 1, d.day)
    }
    const daysUntil = Math.ceil((target.getTime() - today.getTime()) / 86400000)
    if (daysUntil <= 30) {
      const type = d.type === "自定义" ? (d.label ?? "自定义") : d.type
      upcomingRaw.push({
        contactId: d.contact.id,
        contactName: d.contact.name,
        type,
        daysUntil,
      })
    }
  }

  upcomingRaw.sort((a, b) => a.daysUntil - b.daysUntil)
  const upcomingDates = upcomingRaw.slice(0, 5)
  const upcomingDatesCount = upcomingRaw.length

  const contacts = await prisma.contact.findMany({
    where: { userId, deletedAt: null },
    include: {
      interactions: {
        orderBy: { date: "desc" },
        take: 1,
        select: { date: true },
      },
    },
  })

  const neglectedRaw: { id: string; name: string; daysSince: number | null }[] = []

  for (const c of contacts) {
    const last = c.interactions[0]
    if (!last) {
      neglectedRaw.push({ id: c.id, name: c.name, daysSince: null })
    } else {
      const lastDate = new Date(last.date.getFullYear(), last.date.getMonth(), last.date.getDate())
      const daysSince = Math.floor((today.getTime() - lastDate.getTime()) / 86400000)
      if (daysSince > 30) {
        neglectedRaw.push({ id: c.id, name: c.name, daysSince })
      }
    }
  }

  neglectedRaw.sort((a, b) => {
    if (a.daysSince === null && b.daysSince === null) return 0
    if (a.daysSince === null) return 1
    if (b.daysSince === null) return -1
    return b.daysSince - a.daysSince
  })
  const neglectedContacts = neglectedRaw.slice(0, 5)

  return NextResponse.json({
    userName,
    totalContacts,
    thisMonthInteractions,
    upcomingDatesCount,
    upcomingDates,
    neglectedContacts,
  })
}
