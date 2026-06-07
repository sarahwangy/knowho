"use client"

import { useRef } from "react"

const PRESET_AVATARS = [
  "🦊", "🐼", "🦁", "🐯", "🐻", "🐨",
  "🌸", "⭐", "🌙", "🔥", "💎", "🎭",
  "🤖", "👾", "🦄", "🎪",
]

interface AvatarPickerProps {
  current?: string | null
  name: string
  onChange: (avatar: string | null) => void
}

export function AvatarPicker({ current, name, onChange }: AvatarPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert("图片大小不超过 2MB")
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result
      if (typeof result === "string") onChange(result)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#8b7d72]">选择头像</p>

      <div className="grid grid-cols-8 gap-2">
        {/* Reset to initial */}
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-bold text-[#2d2926] bg-[#d4c9c0] transition-colors ${
            !current ? "border-[#3d6b2e]" : "border-transparent hover:border-[#8b7d72]"
          }`}
          title="使用姓名首字"
        >
          {name.charAt(0) || "?"}
        </button>

        {PRESET_AVATARS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onChange(emoji)}
            className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xl transition-colors bg-[#f5f5f5] hover:bg-[#e8f5e3] ${
              current === emoji ? "border-[#3d6b2e]" : "border-transparent hover:border-[#8b7d72]"
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>

      <div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs text-[#3d6b2e] hover:text-[#2d5520] underline underline-offset-2"
        >
          📷 上传照片
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        {current?.startsWith("data:image") && (
          <span className="ml-2 text-xs text-[#8b7d72]">✓ 已上传</span>
        )}
      </div>
    </div>
  )
}
