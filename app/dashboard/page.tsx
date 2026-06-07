"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import Link from "next/link"

interface UpcomingDate {
  contactId: string
  contactName: string
  type: string
  daysUntil: number
}

interface NeglectedContact {
  id: string
  name: string
  daysSince: number | null
}

interface DashboardData {
  userName: string
  totalContacts: number
  thisMonthInteractions: number
  upcomingDatesCount: number
  upcomingDates: UpcomingDate[]
  neglectedContacts: NeglectedContact[]
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return "早上好"
  if (h < 18) return "下午好"
  return "晚上好"
}

function dateEmoji(type: string) {
  if (type === "生日") return "🎂"
  if (type === "纪念日") return "🗓️"
  return "📌"
}

function daysUntilLabel(n: number) {
  if (n === 0) return "今天"
  if (n === 1) return "明天"
  return `${n}天后`
}

function daysSinceLabel(n: number | null) {
  if (n === null) return "从未联系"
  return `${n}天前`
}

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/dashboard", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("failed")
        return r.json()
      })
      .then((d: DashboardData) => {
        setData(d)
        setLoading(false)
      })
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return
        setError("加载失败，请刷新重试")
        setLoading(false)
      })
    return () => controller.abort()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f4f1] p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-7 w-40 bg-[#e8e0d8] rounded" />
          <div className="h-4 w-24 bg-[#e8e0d8] rounded" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 bg-[#e8e0d8] rounded-xl" />
            <div className="h-16 bg-[#e8e0d8] rounded-xl" />
          </div>
          <div className="h-32 bg-[#e8e0d8] rounded-xl" />
          <div className="h-32 bg-[#e8e0d8] rounded-xl" />
        </div>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#f7f4f1] p-5">
        <p className="text-red-500 text-sm">{error ?? "加载失败"}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f7f4f1] flex flex-col pb-24">
      <div className="px-5 pt-8 pb-4 space-y-4">
        {/* Greeting */}
        <div>
          <h1 className="text-xl font-bold text-[#2d2926]">
            {greeting()}，{data.userName.split(" ")[0] || "朋友"} 👋
          </h1>
          <p className="text-sm text-[#8b7d72] mt-0.5">共 {data.totalContacts} 位联系人</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-[#8b7d72] mb-1">本月互动</p>
            <p className="text-2xl font-bold text-[#2d2926]">{data.thisMonthInteractions}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-[#8b7d72] mb-1">近期日期</p>
            <p className="text-2xl font-bold text-[#2d2926]">{data.upcomingDatesCount}</p>
          </div>
        </div>

        {/* Upcoming dates — only render if non-empty */}
        {data.upcomingDates.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-[#8b7d72] mb-3">即将到来</p>
            <ul className="space-y-3">
              {data.upcomingDates.map((d) => (
                <li key={`${d.contactId}-${d.type}-${d.daysUntil}`}>
                  <Link
                    href={`/people/${d.contactId}`}
                    className="flex items-center gap-3"
                  >
                    <span className="text-lg">{dateEmoji(d.type)}</span>
                    <span className="flex-1 text-sm text-[#2d2926]">
                      {d.contactName} · {d.type}
                    </span>
                    <span className="text-xs text-[#8b7d72]">{daysUntilLabel(d.daysUntil)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Neglected contacts — only render if non-empty */}
        {data.neglectedContacts.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-[#8b7d72] mb-3">久未联系</p>
            <ul className="space-y-3">
              {data.neglectedContacts.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/people/${c.id}`}
                    className="flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#d4c9c0] flex items-center justify-center font-bold text-[#2d2926] text-sm shrink-0">
                      {c.name.charAt(0) || "?"}
                    </div>
                    <span className="flex-1 text-sm text-[#2d2926]">{c.name}</span>
                    <span className="text-xs text-[#c0b8b0]">{daysSinceLabel(c.daysSince)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Link to people list */}
        <Link
          href="/people"
          className="block text-center text-sm text-[#8b7d72] hover:text-[#2d2926] py-2"
        >
          查看所有联系人 →
        </Link>
      </div>

      {/* FAB */}
      <button
        onClick={() => router.push("/new-person")}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#7a9e6a] text-white shadow-lg flex items-center justify-center hover:bg-[#6a8f5a] transition-colors"
        aria-label="添加联系人"
      >
        <Plus className="h-6 w-6" />
      </button>
    </main>
  )
}
