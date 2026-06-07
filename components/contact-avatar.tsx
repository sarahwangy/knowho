interface ContactAvatarProps {
  name: string
  avatar?: string | null
  size?: "sm" | "md" | "lg"
  className?: string
}

const SIZE_MAP = {
  sm: { outer: "w-10 h-10", text: "text-base", emoji: "text-xl" },
  md: { outer: "w-14 h-14", text: "text-2xl", emoji: "text-3xl" },
  lg: { outer: "w-20 h-20", text: "text-3xl", emoji: "text-4xl" },
}

export function ContactAvatar({ name, avatar, size = "md", className = "" }: ContactAvatarProps) {
  const s = SIZE_MAP[size]

  if (avatar?.startsWith("data:image")) {
    return (
      <div className={`${s.outer} rounded-full overflow-hidden shrink-0 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatar} alt={name} className="w-full h-full object-cover" />
      </div>
    )
  }

  if (avatar) {
    return (
      <div className={`${s.outer} rounded-full bg-[#d4c9c0] flex items-center justify-center shrink-0 ${className}`}>
        <span className={s.emoji}>{avatar}</span>
      </div>
    )
  }

  return (
    <div className={`${s.outer} rounded-full bg-[#d4c9c0] flex items-center justify-center font-bold text-[#2d2926] shrink-0 ${className} ${s.text}`}>
      {name.charAt(0) || "?"}
    </div>
  )
}
