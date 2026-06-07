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

interface WeatherData {
  temp: number
  icon: string
  city: string
}

interface DashboardData {
  userName: string
  totalContacts: number
  thisMonthInteractions: number
  upcomingDatesCount: number
  upcomingDates: UpcomingDate[]
  neglectedContacts: NeglectedContact[]
}

function weatherEmoji(icon: string) {
  const code = icon.slice(0, 2)
  const map: Record<string, string> = {
    "01": "☀️", "02": "⛅", "03": "☁️", "04": "☁️",
    "09": "🌧️", "10": "🌧️", "11": "⛈️", "13": "🌨️", "50": "🌫️",
  }
  return map[code] ?? "🌡️"
}

function weatherAnimation(icon: string): string {
  const code = icon.slice(0, 2)
  if (code === "01") return "animate-[weather-sun-pulse_2s_ease-in-out_infinite]"
  if (["02", "03", "04", "50"].includes(code)) return "animate-[weather-float_3s_ease-in-out_infinite]"
  if (["09", "10", "11"].includes(code)) return "animate-[weather-rain-drip_1.5s_ease-in-out_infinite]"
  return ""
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
  const [weather, setWeather] = useState<WeatherData | null>(null)

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

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords
        fetch(`/api/weather?lat=${lat}&lon=${lon}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => { if (d) setWeather(d) })
          .catch(() => {})
      },
      () => {}
    )
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen p-5">
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
      <main className="min-h-screen p-5">
        <p className="text-red-500 text-sm">{error ?? "加载失败"}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col pb-24">
      <div className="px-5 pt-8 pb-4 space-y-4">
        {/* Greeting */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-white">
              {greeting()}，{data.userName.split(" ")[0] || "朋友"} 👋
            </h1>
            <p className="text-sm text-white/70 mt-0.5">共 {data.totalContacts} 位联系人</p>
          </div>
          {weather && (
            <div className="text-right shrink-0">
              <p className="text-2xl text-white font-light flex items-center gap-1 justify-end">
                <span className={`inline-block ${weatherAnimation(weather.icon)}`}>{weatherEmoji(weather.icon)}</span>
                <span>{weather.temp}°</span>
              </p>
              <p className="text-xs text-white/80 mt-0.5">{weather.city}</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => router.push("/people")}
            className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow text-left w-full cursor-pointer"
          >
            <p className="text-sm text-[#8b7d72]">本月互动</p>
            <p className="text-3xl font-bold text-[#2d2926] mt-1">{data.thisMonthInteractions}</p>
          </button>
          <button
            type="button"
            onClick={() => router.push("/calendar")}
            className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow text-left w-full cursor-pointer"
          >
            <p className="text-sm text-[#8b7d72]">近期日期</p>
            <p className="text-3xl font-bold text-[#2d2926] mt-1">{data.upcomingDatesCount}</p>
          </button>
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
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#3d6b2e] text-white shadow-lg flex items-center justify-center hover:bg-[#2d5520] transition-colors"
        aria-label="添加联系人"
      >
        <Plus className="h-6 w-6" />
      </button>
    </main>
  )
}
