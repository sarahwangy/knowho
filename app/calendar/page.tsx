"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface CalendarDate {
  contactId: string
  contactName: string
  type: string
  month: number
  day: number
}

const DAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"]

function buildGrid(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  return cells
}

export default function CalendarPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [dates, setDates] = useState<CalendarDate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  useEffect(() => {
    setLoading(true)
    setSelectedDay(null)
    const controller = new AbortController()
    fetch(`/api/calendar?year=${year}&month=${month}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        setDates(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return
        setDates([])
        setLoading(false)
      })
    return () => controller.abort()
  }, [year, month])

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const grid = buildGrid(year, month)
  const eventsByDay = new Map<number, CalendarDate[]>()
  for (const d of dates) {
    const arr = eventsByDay.get(d.day) ?? []
    arr.push(d)
    eventsByDay.set(d.day, arr)
  }

  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() + 1 &&
    year === today.getFullYear()

  const selectedEvents = selectedDay ? (eventsByDay.get(selectedDay) ?? []) : []

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <button
          onClick={prevMonth}
          className="p-2 rounded-full hover:bg-white/30 text-white"
          aria-label="上个月"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-white">
          {year}年{month}月
        </h1>
        <button
          onClick={nextMonth}
          className="p-2 rounded-full hover:bg-white/30 text-white"
          aria-label="下个月"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Grid */}
      <div className="px-4">
        {/* Day labels */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map((l) => (
            <div key={l} className="text-center text-xs text-white/70 py-1">
              {l}
            </div>
          ))}
        </div>

        {/* Day cells */}
        {loading ? (
          <div className="h-48 flex items-center justify-center text-white/60 text-sm">加载中…</div>
        ) : (
          <div className="grid grid-cols-7 gap-y-1">
            {grid.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} />
              const events = eventsByDay.get(day)
              const today_ = isToday(day)
              const selected = selectedDay === day
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => events ? setSelectedDay(selected ? null : day) : undefined}
                  className={`flex flex-col items-center py-1.5 rounded-lg ${
                    today_ ? "bg-white text-[#3d6b2e] font-bold" :
                    selected ? "bg-white/20" : ""
                  }`}
                >
                  <span className={`text-sm ${today_ ? "text-[#3d6b2e]" : "text-white"}`}>
                    {day}
                  </span>
                  {events && (
                    <div className="flex gap-0.5 mt-0.5">
                      {events.slice(0, 3).map((_, i) => (
                        <span
                          key={i}
                          className={`w-1 h-1 rounded-full ${today_ ? "bg-[#3d6b2e]" : "bg-white"}`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom sheet for selected day */}
      {selectedDay !== null && selectedEvents.length > 0 && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setSelectedDay(null)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl px-5 pt-5 pb-10 max-w-2xl mx-auto">
            <p className="text-sm font-semibold text-[#2d2926] mb-4">
              {month}月{selectedDay}日
            </p>
            <ul className="space-y-3">
              {selectedEvents.map((e, i) => (
                <li key={i}>
                  <Link
                    href={`/people/${e.contactId}`}
                    className="flex items-center gap-3"
                  >
                    <span className="text-lg">
                      {e.type === "生日" ? "🎂" : e.type === "纪念日" ? "🗓️" : "📌"}
                    </span>
                    <span className="flex-1 text-sm text-[#2d2926]">
                      {e.contactName}
                    </span>
                    <span className="text-xs text-[#8b7d72]">{e.type}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </main>
  )
}
