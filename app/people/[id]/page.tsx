"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { TagPicker, type SelectedTag } from "@/components/tag-picker"

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

const editSchema = z.object({
  name: z.string().min(1, "姓名不能为空"),
  metAt: z.string().optional(),
  impression: z.string().optional(),
  contactFreq: z.string().optional(),
})

type EditValues = z.infer<typeof editSchema>

const interactionSchema = z.object({
  content: z.string().min(1, "内容不能为空"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "请选择有效日期"),
})

type InteractionValues = z.infer<typeof interactionSchema>

const dateSchema = z.object({
  type: z.enum(["生日", "纪念日", "自定义"]),
  label: z.string().optional(),
  month: z.string().min(1, "请选择月份"),
  day: z.string().min(1, "请选择日期"),
  year: z.string().optional(),
}).superRefine((val, ctx) => {
  if (val.type === "自定义" && !val.label?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "请填写标签", path: ["label"] })
  }
})

type DateValues = z.infer<typeof dateSchema>

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
  const [deletingInteractionId, setDeletingInteractionId] = useState<string | null>(null)
  const [deletingDateId, setDeletingDateId] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editTags, setEditTags] = useState<SelectedTag[]>([])
  const [editError, setEditError] = useState<string | null>(null)
  const [interactionSheetOpen, setInteractionSheetOpen] = useState(false)
  const [interactionError, setInteractionError] = useState<string | null>(null)
  const [dateSheetOpen, setDateSheetOpen] = useState(false)
  const [dateError, setDateError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditValues>({ resolver: zodResolver(editSchema) })

  const {
    register: registerInteraction,
    handleSubmit: handleInteractionSubmit,
    reset: resetInteraction,
    formState: { errors: interactionErrors, isSubmitting: isInteractionSubmitting },
  } = useForm<InteractionValues>({ resolver: zodResolver(interactionSchema) })

  const {
    register: registerDate,
    handleSubmit: handleDateSubmit,
    reset: resetDate,
    watch: watchDate,
    formState: { errors: dateErrors, isSubmitting: isDateSubmitting },
  } = useForm<DateValues>({ resolver: zodResolver(dateSchema) })

  const watchedDateType = watchDate("type")

  async function loadContact(signal?: AbortSignal) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/contacts/${id}`, { signal })
      if (!res.ok) {
        setError("加载失败，请返回重试")
        return
      }
      const data: Contact = await res.json()
      setContact(data)
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

  function openEdit() {
    if (!contact) return
    reset({
      name: contact.name,
      metAt: contact.metAt ?? "",
      impression: contact.impression ?? "",
      contactFreq: contact.contactFreq ?? "",
    })
    setEditTags(contact.tags.map((t) => ({ id: t.id, name: t.name })))
    setEditError(null)
    setEditOpen(true)
  }

  function openInteractionSheet() {
    const today = new Date().toISOString().slice(0, 10)
    resetInteraction({ content: "", date: today })
    setInteractionError(null)
    setInteractionSheetOpen(true)
  }

  async function onInteractionSubmit(data: InteractionValues) {
    setInteractionError(null)
    try {
      const res = await fetch(`/api/contacts/${id}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: data.content, date: data.date }),
      })
      if (!res.ok) {
        setInteractionError("记录失败，请重试")
        return
      }
      setInteractionSheetOpen(false)
      await loadContact(new AbortController().signal)
    } catch {
      setInteractionError("记录失败，请重试")
    }
  }

  function openDateSheet() {
    resetDate({ type: "生日", label: "", month: "", day: "", year: "" })
    setDateError(null)
    setDateSheetOpen(true)
  }

  async function onDateSubmit(data: DateValues) {
    setDateError(null)
    try {
      const body: Record<string, unknown> = {
        type: data.type,
        month: parseInt(data.month, 10),
        day: parseInt(data.day, 10),
        remindDaysBefore: 3,
      }
      if (data.type === "自定义" && data.label) body.label = data.label
      if (data.year) body.year = parseInt(data.year, 10)

      const res = await fetch(`/api/contacts/${id}/dates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        setDateError("添加失败，请重试")
        return
      }
      setDateSheetOpen(false)
      await loadContact(new AbortController().signal)
    } catch {
      setDateError("添加失败，请重试")
    }
  }

  async function resolveNewTags(newTagNames: string[]): Promise<string[]> {
    const ids: string[] = []
    for (const name of newTagNames) {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (res.status === 201) {
        const tag = await res.json()
        ids.push(tag.id)
      } else if (res.status === 409) {
        const tagsRes = await fetch("/api/tags")
        if (tagsRes.ok) {
          const allTags: Tag[] = await tagsRes.json()
          const existing = allTags.find(
            (t) => t.name.toLowerCase() === name.toLowerCase()
          )
          if (existing) ids.push(existing.id)
        }
      }
    }
    return ids
  }

  async function onEditSubmit(data: EditValues) {
    setEditError(null)
    try {
      const existingTagIds = editTags.filter((t) => t.id).map((t) => t.id as string)
      const newTagNames = editTags.filter((t) => !t.id).map((t) => t.name)
      const newTagIds = await resolveNewTags(newTagNames)
      const tagIds = [...existingTagIds, ...newTagIds]

      const res = await fetch(`/api/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          metAt: data.metAt || null,
          impression: data.impression || null,
          contactFreq: data.contactFreq || null,
          tagIds,
        }),
      })

      if (!res.ok) {
        setEditError("保存失败，请重试")
        return
      }

      setEditOpen(false)
      await loadContact(new AbortController().signal)
    } catch {
      setEditError("保存失败，请重试")
    }
  }

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

  async function handleDeleteInteraction(interactionId: string) {
    if (!window.confirm("确定删除这条互动记录？")) return
    setDeletingInteractionId(interactionId)
    try {
      const res = await fetch(`/api/interactions/${interactionId}`, { method: "DELETE" })
      if (res.ok) {
        await loadContact(new AbortController().signal)
      } else {
        setError("删除失败，请重试")
      }
    } finally {
      setDeletingInteractionId(null)
    }
  }

  async function handleDeleteDate(dateId: string) {
    if (!window.confirm("确定删除这个日期？")) return
    setDeletingDateId(dateId)
    try {
      const res = await fetch(`/api/contacts/${id}/dates/${dateId}`, { method: "DELETE" })
      if (res.ok) {
        await loadContact(new AbortController().signal)
      } else {
        setError("删除失败，请重试")
      }
    } finally {
      setDeletingDateId(null)
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
          onClick={openEdit}
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
            {contact.contactFreq && (
              <p className="text-xs text-[#8b7d72] mt-0.5">🔁 {contact.contactFreq}联系</p>
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
                <li key={d.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-[#2d2926] flex-1 min-w-0">{formatDate(d)}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteDate(d.id)}
                    disabled={deletingDateId !== null}
                    title="删除日期"
                    className="shrink-0 text-[#c0b8b0] hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={openDateSheet}
            className="mt-3 flex items-center gap-1 text-xs text-[#8b7d72] hover:text-[#2d2926]"
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
                <li key={i.id} className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#2d2926]">{i.content}</p>
                    <p className="text-xs text-[#8b7d72] mt-0.5">
                      {formatInteractionDate(i.date)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteInteraction(i.id)}
                    disabled={deletingInteractionId !== null}
                    title="删除互动记录"
                    className="shrink-0 mt-0.5 text-[#c0b8b0] hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={openInteractionSheet}
            className="mt-3 flex items-center gap-1 text-xs text-[#8b7d72] hover:text-[#2d2926]"
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

      {/* Edit sheet */}
      {editOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setEditOpen(false)}
          />
          {/* Sheet */}
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl px-5 pt-5 pb-10 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-[#2d2926]">编辑联系人</h2>
              <button
                onClick={() => setEditOpen(false)}
                className="text-sm text-[#8b7d72]"
              >
                取消
              </button>
            </div>

            {editError && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {editError}
              </div>
            )}

            <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-[#2d2926]">姓名</Label>
                <Input
                  id="edit-name"
                  {...register("name")}
                  className={errors.name ? "border-red-400" : ""}
                />
                {errors.name && (
                  <p className="text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-metAt" className="text-[#2d2926]">认识场合</Label>
                <Input
                  id="edit-metAt"
                  placeholder="读书会、健身房…"
                  {...register("metAt")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-impression" className="text-[#2d2926]">一句话印象</Label>
                <Textarea
                  id="edit-impression"
                  rows={3}
                  {...register("impression")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-contactFreq" className="text-[#2d2926]">联系频率</Label>
                <select
                  id="edit-contactFreq"
                  {...register("contactFreq")}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm text-[#2d2926] focus:outline-none focus:ring-2 focus:ring-[#2d2926]"
                >
                  <option value="">无</option>
                  <option value="每周">每周</option>
                  <option value="每两周">每两周</option>
                  <option value="每月">每月</option>
                  <option value="每季度">每季度</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[#2d2926]">标签</Label>
                <TagPicker value={editTags} onChange={setEditTags} />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#2d2926] text-white hover:bg-[#3d3533]"
              >
                {isSubmitting ? "保存中…" : "保存"}
              </Button>
            </form>
          </div>
        </>
      )}

      {/* Interaction sheet */}
      {interactionSheetOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setInteractionSheetOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl px-5 pt-5 pb-10 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-[#2d2926]">记录一次</h2>
              <button
                onClick={() => setInteractionSheetOpen(false)}
                className="text-sm text-[#8b7d72]"
              >
                取消
              </button>
            </div>

            {interactionError && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {interactionError}
              </div>
            )}

            <form onSubmit={handleInteractionSubmit(onInteractionSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="interaction-content" className="text-[#2d2926]">内容</Label>
                <Textarea
                  id="interaction-content"
                  rows={4}
                  placeholder="聊了什么、发生了什么…"
                  {...registerInteraction("content")}
                  className={interactionErrors.content ? "border-red-400" : ""}
                />
                {interactionErrors.content && (
                  <p className="text-xs text-red-500">{interactionErrors.content.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="interaction-date" className="text-[#2d2926]">日期</Label>
                <input
                  id="interaction-date"
                  type="date"
                  {...registerInteraction("date")}
                  className={`w-full rounded-md border px-3 py-2 text-sm text-[#2d2926] focus:outline-none focus:ring-2 focus:ring-[#2d2926] ${interactionErrors.date ? "border-red-400" : "border-input"}`}
                />
                {interactionErrors.date && (
                  <p className="text-xs text-red-500">{interactionErrors.date.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isInteractionSubmitting}
                className="w-full bg-[#2d2926] text-white hover:bg-[#3d3533]"
              >
                {isInteractionSubmitting ? "保存中…" : "记下来"}
              </Button>
            </form>
          </div>
        </>
      )}

      {/* Date sheet */}
      {dateSheetOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setDateSheetOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl px-5 pt-5 pb-10 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-[#2d2926]">添加日期</h2>
              <button
                onClick={() => setDateSheetOpen(false)}
                className="text-sm text-[#8b7d72]"
              >
                取消
              </button>
            </div>

            {dateError && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {dateError}
              </div>
            )}

            <form onSubmit={handleDateSubmit(onDateSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="date-type" className="text-[#2d2926]">类型</Label>
                <select
                  id="date-type"
                  {...registerDate("type")}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm text-[#2d2926] focus:outline-none focus:ring-2 focus:ring-[#2d2926]"
                >
                  <option value="生日">生日</option>
                  <option value="纪念日">纪念日</option>
                  <option value="自定义">自定义</option>
                </select>
              </div>

              {watchedDateType === "自定义" && (
                <div className="space-y-1.5">
                  <Label htmlFor="date-label" className="text-[#2d2926]">标签</Label>
                  <Input
                    id="date-label"
                    placeholder="如：相识纪念日"
                    {...registerDate("label")}
                    className={dateErrors.label ? "border-red-400" : ""}
                  />
                  {dateErrors.label && (
                    <p className="text-xs text-red-500">{dateErrors.label.message}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="date-month" className="text-[#2d2926]">月</Label>
                  <select
                    id="date-month"
                    {...registerDate("month")}
                    className={`w-full rounded-md border px-3 py-2 text-sm text-[#2d2926] focus:outline-none focus:ring-2 focus:ring-[#2d2926] ${dateErrors.month ? "border-red-400" : "border-input"}`}
                  >
                    <option value="">请选择</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={String(m)}>{m}月</option>
                    ))}
                  </select>
                  {dateErrors.month && (
                    <p className="text-xs text-red-500">{dateErrors.month.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="date-day" className="text-[#2d2926]">日</Label>
                  <select
                    id="date-day"
                    {...registerDate("day")}
                    className={`w-full rounded-md border px-3 py-2 text-sm text-[#2d2926] focus:outline-none focus:ring-2 focus:ring-[#2d2926] ${dateErrors.day ? "border-red-400" : "border-input"}`}
                  >
                    <option value="">请选择</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={String(d)}>{d}日</option>
                    ))}
                  </select>
                  {dateErrors.day && (
                    <p className="text-xs text-red-500">{dateErrors.day.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="date-year" className="text-[#2d2926]">年份（可选）</Label>
                <input
                  id="date-year"
                  type="number"
                  placeholder="如：1990"
                  {...registerDate("year")}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm text-[#2d2926] focus:outline-none focus:ring-2 focus:ring-[#2d2926]"
                />
              </div>

              <Button
                type="submit"
                disabled={isDateSubmitting}
                className="w-full bg-[#2d2926] text-white hover:bg-[#3d3533]"
              >
                {isDateSubmitting ? "添加中…" : "添加"}
              </Button>
            </form>
          </div>
        </>
      )}
    </main>
  )
}
