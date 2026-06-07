"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { TagPicker, type SelectedTag } from "@/components/tag-picker"
import { MicButton } from "@/components/mic-button"

const schema = z.object({
  name: z.string().min(1, "姓名不能为空"),
  metAt: z.string().optional(),
  impression: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function NewPersonPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedTags, setSelectedTags] = useState<SelectedTag[]>(() => {
    const tagsParam = searchParams.get("tags")
    if (!tagsParam) return []
    return tagsParam.split(",").filter(Boolean).map((name) => ({ name }))
  })
  const [apiError, setApiError] = useState<string | null>(null)
  const [voiceError, setVoiceError] = useState<string | null>(null)

  useEffect(() => {
    if (!voiceError) return
    const t = setTimeout(() => setVoiceError(null), 3000)
    return () => clearTimeout(t)
  }, [voiceError])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: searchParams.get("name") ?? "",
      metAt: searchParams.get("metAt") ?? "",
      impression: searchParams.get("impression") ?? "",
    },
  })

  async function onSubmit(data: FormValues) {
    setApiError(null)

    const tagIds = selectedTags.filter((t) => t.id).map((t) => t.id as string)
    const newTags = selectedTags.filter((t) => !t.id).map((t) => t.name)

    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          metAt: data.metAt || undefined,
          impression: data.impression || undefined,
          tagIds,
          newTags,
        }),
      })

      if (!res.ok) {
        setApiError("好像出了点问题，再试一次？")
        return
      }

      const contact = await res.json()
      if (!contact?.id) {
        setApiError("好像出了点问题，再试一次？")
        return
      }
      router.push(`/people/${contact.id}`)
    } catch {
      setApiError("好像出了点问题，再试一次？")
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex-1 px-5 pt-8 pb-6 max-w-md mx-auto w-full">
        <h1 className="text-xl font-semibold text-[#2d2926] mb-6">
          认识新朋友了？
        </h1>

        {apiError && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {apiError}
          </div>
        )}

        {voiceError && (
          <div className="mb-4 rounded-lg bg-orange-50 border border-orange-200 px-4 py-3 text-sm text-orange-700">
            {voiceError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-[#2d2926]">
              叫什么名字？
            </Label>
            <Input
              id="name"
              autoFocus
              placeholder="姓名"
              {...register("name")}
              className={errors.name ? "border-red-400" : ""}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="metAt" className="text-[#2d2926]">
              在哪儿认识的？
            </Label>
            <Input
              id="metAt"
              placeholder="读书会、健身房、邻居楼…"
              {...register("metAt")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="impression" className="text-[#2d2926]">
              让你记住 Ta 的那件事
            </Label>
            <Textarea
              id="impression"
              placeholder="他喜欢骑行，养了一只猫叫豆豆…"
              rows={3}
              {...register("impression")}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[#2d2926]">标签</Label>
            <TagPicker value={selectedTags} onChange={setSelectedTags} />
          </div>

          <div className="flex items-center gap-2">
            <MicButton
              onTranscript={(text) => setValue("impression", text)}
              onError={(msg) => setVoiceError(msg)}
              className="flex items-center gap-1.5 rounded-md border border-[#d4c9c0] px-3 py-1.5 text-sm text-[#8b7d72] hover:text-[#3d6b2e] hover:border-[#3d6b2e]"
            />
            <span className="text-xs text-[#8b7d72]">语音备注</span>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#3d6b2e] text-white hover:bg-[#2d5520]"
          >
            {isSubmitting ? "保存中…" : "记下来"}
          </Button>
        </form>
      </div>
    </main>
  )
}
