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

interface ContactOption {
  id: string
  name: string
  metAt: string | null
}

type AddEventType = "认识了谁" | "记生日" | "重要事件"

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
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [addEventType, setAddEventType] = useState<AddEventType | null>(null)
  const [contactSearch, setContactSearch] = useState("")
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [eventLabel, setEventLabel] = useState("")
  const [addEventYear, setAddEventYear] = useState("")
  const [addEventError, setAddEventError] = useState<string | null>(null)
  const [addEventSaving, setAddEventSaving] = useState(false)

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

  useEffect(() => {
    fetch("/api/contacts")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setContacts(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

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

  function openAddEvent(type: AddEventType) {
    setAddEventType(type)
    setContactSearch("")
    setSelectedContactId(null)
    setEventLabel("")
    setAddEventYear("")
    setAddEventError(null)
  }

  function closeAddEvent() {
    setAddEventType(null)
  }

  async function submitAddEvent() {
    if (!selectedDay) return
    if (addEventType === "认识了谁") {
      window.location.href = `/new-person?metAt=${encodeURIComponent(`${year}年${month}月${selectedDay}日认识`)}`
      return
    }
    if (!selectedContactId) {
      setAddEventError("请选择一位联系人")
      return
    }
    if (addEventType === "重要事件" && !eventLabel.trim()) {
      setAddEventError("请填写事件名称")
      return
    }
    setAddEventSaving(true)
    setAddEventError(null)
    try {
      const body = {
        type: addEventType === "记生日" ? "生日" : "自定义",
        label: addEventType === "重要事件" ? eventLabel.trim() : undefined,
        month,
        day: selectedDay,
        year: addEventYear ? parseInt(addEventYear) : undefined,
      }
      const res = await fetch(`/api/contacts/${selectedContactId}/dates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        setAddEventError("保存失败，请重试")
        return
      }
      closeAddEvent()
      setDates([])
      setLoading(true)
      fetch(`/api/calendar?year=${year}&month=${month}`)
        .then((r) => r.json())
        .then((data) => { setDates(Array.isArray(data) ? data : []); setLoading(false) })
        .catch(() => setLoading(false))
    } catch {
      setAddEventError("保存失败，请重试")
    } finally {
      setAddEventSaving(false)
    }
  }

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
                  onClick={() => setSelectedDay(selected ? null : day)}
                  className={`flex flex-col items-center py-1.5 rounded-lg transition-colors cursor-pointer ${
                    today_ ? "bg-white text-[#3d6b2e] font-bold" :
                    selected ? "bg-white/30" : "hover:bg-white/10"
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

      {/* Action panel — shown when a day is selected */}
      {selectedDay !== null && (
        <div className="px-4 mt-4">
          <p className="text-white/80 text-sm mb-3 text-center">
            {month}月{selectedDay}日 · 添加
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(["认识了谁", "记生日", "重要事件"] as AddEventType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => openAddEvent(type)}
                className="flex flex-col items-center gap-1.5 bg-white/20 hover:bg-white/30 rounded-xl py-3 px-2 transition-colors"
              >
                <span className="text-xl">
                  {type === "认识了谁" ? "🤝" : type === "记生日" ? "🎂" : "📌"}
                </span>
                <span className="text-xs text-white font-medium">{type}</span>
              </button>
            ))}
          </div>
        </div>
      )}

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

      {/* Add event modal */}
      {addEventType !== null && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeAddEvent} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl px-5 pt-5 pb-6 w-[calc(100%-2rem)] max-w-md max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-[#2d2926]">
                {addEventType === "认识了谁" ? "🤝" : addEventType === "记生日" ? "🎂" : "📌"} {addEventType}
              </h2>
              <button type="button" onClick={closeAddEvent} className="text-sm text-[#8b7d72]">取消</button>
            </div>

            <p className="text-sm text-[#8b7d72] mb-4">{month}月{selectedDay}日</p>

            {addEventError && (
              <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
                {addEventError}
              </div>
            )}

            {addEventType === "认识了谁" ? (
              <div className="space-y-3">
                <p className="text-sm text-[#2d2926]">将跳转到添加联系人页面，日期已预填。</p>
                <button
                  type="button"
                  onClick={submitAddEvent}
                  className="w-full bg-[#3d6b2e] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#2d5520] transition-colors"
                >
                  去添加联系人
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-[#8b7d72] mb-1.5 block">选择联系人</label>
                  <input
                    type="text"
                    placeholder="搜索姓名…"
                    value={contactSearch}
                    onChange={(e) => { setContactSearch(e.target.value); setSelectedContactId(null) }}
                    className="w-full rounded-lg border border-[#e8e0d8] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d6b2e]"
                  />
                  {contactSearch && (
                    <div className="mt-1 border border-[#e8e0d8] rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                      {contacts
                        .filter((c) => c.name.toLowerCase().includes(contactSearch.toLowerCase()))
                        .slice(0, 8)
                        .map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => { setSelectedContactId(c.id); setContactSearch(c.name) }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-[#f5f5f5] ${selectedContactId === c.id ? "bg-[#e8f5e3] text-[#3d6b2e]" : "text-[#2d2926]"}`}
                          >
                            {c.name}
                          </button>
                        ))}
                      {contacts.filter((c) => c.name.toLowerCase().includes(contactSearch.toLowerCase())).length === 0 && (
                        <p className="px-3 py-2 text-sm text-[#8b7d72]">没有找到联系人</p>
                      )}
                    </div>
                  )}
                </div>

                {addEventType === "重要事件" && (
                  <div>
                    <label className="text-xs text-[#8b7d72] mb-1.5 block">事件名称</label>
                    <input
                      type="text"
                      placeholder="如：相识纪念日"
                      value={eventLabel}
                      onChange={(e) => setEventLabel(e.target.value)}
                      className="w-full rounded-lg border border-[#e8e0d8] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d6b2e]"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs text-[#8b7d72] mb-1.5 block">年份（可选）</label>
                  <input
                    type="number"
                    placeholder="如：1990"
                    value={addEventYear}
                    onChange={(e) => setAddEventYear(e.target.value)}
                    className="w-full rounded-lg border border-[#e8e0d8] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d6b2e]"
                  />
                </div>

                <button
                  type="button"
                  onClick={submitAddEvent}
                  disabled={addEventSaving}
                  className="w-full bg-[#3d6b2e] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#2d5520] transition-colors disabled:opacity-50"
                >
                  {addEventSaving ? "保存中…" : "保存"}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  )
}
