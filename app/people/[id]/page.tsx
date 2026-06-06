"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Tag {
  id: string
  name: string
  isPreset: boolean
}

interface ImportantDate {
  id: string
  type: string
  label: string | null
  month: number
  day: number
  year: number | null
  remindDaysBefore: number
}

interface Interaction {
  id: string
  content: string
  date: string
  createdAt: string
}

interface Contact {
  id: string
  name: string
  metAt: string | null
  impression: string | null
  contactFreq: string | null
  tags: Tag[]
  importantDates: ImportantDate[]
  interactions: Interaction[]
}

function dateEmoji(type: string) {
  if (type === "生日") return "🎂"
  if (type === "纪念日") return "🗓️"
  return "📌"
}

function formatDate(d: ImportantDate) {
  const label = d.type === "自定义" ? (d.label ?? "自定义") : d.type
  const year = d.year ? `（${d.year}年）` : ""
  return `${dateEmoji(d.type)} ${label} · ${d.month}月${d.day}日${year}`
}

function formatInteractionDate(dateStr: string) {
  return dateStr.slice(0, 10)
}

export default function ContactProfilePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  async function loadContact(signal?: AbortSignal) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/contacts/${id}`, { signal })
      if (!res.ok) {
        setError("加载失败，请返回重试")
        return
      }
      setContact(await res.json())
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return
      setError("加载失败，请返回重试")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    loadContact(controller.signal)
    return () => controller.abort()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleDelete() {
    if (!window.confirm("确定删除？此操作不可撤销")) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" })
      if (res.ok) {
        router.push("/people")
      } else {
        setError("删除失败，请重试")
      }
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f4f1] p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-16 bg-[#e8e0d8] rounded" />
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-[#e8e0d8]" />
            <div className="space-y-2">
              <div className="h-5 w-24 bg-[#e8e0d8] rounded" />
              <div className="h-3 w-16 bg-[#e8e0d8] rounded" />
            </div>
          </div>
          <div className="h-24 bg-[#e8e0d8] rounded-xl" />
          <div className="h-24 bg-[#e8e0d8] rounded-xl" />
        </div>
      </main>
    )
  }

  if (error || !contact) {
    return (
      <main className="min-h-screen bg-[#f7f4f1] p-5">
        <button
          onClick={() => router.push("/people")}
          className="flex items-center gap-1 text-[#8b7d72] mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </button>
        <p className="text-red-500 text-sm">{error ?? "联系人不存在"}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f7f4f1] flex flex-col pb-20">
      {/* Nav */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <button
          onClick={() => router.push("/people")}
          className="flex items-center gap-1 text-[#8b7d72]"
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </button>
        <button
          onClick={() => setEditOpen(true)}
          className="text-sm text-[#2d2926] font-medium"
        >
          编辑
        </button>
      </div>

      <div className="px-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#d4c9c0] flex items-center justify-center font-bold text-[#2d2926] text-2xl shrink-0">
            {contact.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#2d2926]">{contact.name}</h1>
            {contact.metAt && (
              <p className="text-sm text-[#8b7d72] mt-0.5">{contact.metAt}</p>
            )}
          </div>
        </div>

        {/* Tags */}
        {contact.tags.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {contact.tags.map((tag) => (
                <Badge key={tag.id} variant="outline" className="border-[#e8e0d8] text-[#8b7d72]">
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Impression */}
        {contact.impression && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-[#8b7d72] mb-1">一句话印象</p>
            <p className="text-sm text-[#2d2926]">{contact.impression}</p>
          </div>
        )}

        {/* Important dates */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-[#8b7d72] mb-3">重要日期</p>
          {contact.importantDates.length === 0 ? (
            <p className="text-sm text-[#8b7d72]">暂无重要日期</p>
          ) : (
            <ul className="space-y-2">
              {contact.importantDates.map((d) => (
                <li key={d.id} className="text-sm text-[#2d2926]">
                  {formatDate(d)}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            disabled
            className="mt-3 flex items-center gap-1 text-xs text-[#c0b8b0] cursor-not-allowed"
          >
            <Plus className="h-3 w-3" />
            添加日期
          </button>
        </div>

        {/* Interactions */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-[#8b7d72] mb-3">互动记录</p>
          {contact.interactions.length === 0 ? (
            <p className="text-sm text-[#8b7d72]">还没有互动记录</p>
          ) : (
            <ul className="space-y-3">
              {contact.interactions.map((i) => (
                <li key={i.id}>
                  <p className="text-sm text-[#2d2926]">{i.content}</p>
                  <p className="text-xs text-[#8b7d72] mt-0.5">
                    {formatInteractionDate(i.date)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            disabled
            className="mt-3 flex items-center gap-1 text-xs text-[#c0b8b0] cursor-not-allowed"
          >
            <Plus className="h-3 w-3" />
            记录一次
          </button>
        </div>

        {/* Delete */}
        <div className="pt-4 pb-8 text-center">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm text-red-400 hover:text-red-600 disabled:opacity-50"
          >
            {deleting ? "删除中…" : "删除联系人"}
          </button>
        </div>
      </div>

      {/* Edit sheet placeholder */}
      {editOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setEditOpen(false)}
        />
      )}
    </main>
  )
}
