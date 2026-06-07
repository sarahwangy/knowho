"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bot, Calendar, Home, Users } from "lucide-react"

const NAV_ITEMS = [
  { href: "/dashboard", label: "首页", icon: Home },
  { href: "/people", label: "联系人", icon: Users },
  { href: "/calendar", label: "日历", icon: Calendar },
  { href: "/ai", label: "AI", icon: Bot },
]

export function Nav() {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile: bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 h-16 bg-white border-t border-[#e8e0d8] flex items-center justify-around z-50 md:hidden">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 py-2 px-6 rounded-lg transition-colors ${
                active ? "text-[#3d6b2e]" : "text-[#8b7d72] hover:text-[#3d6b2e]"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className={`text-xs ${active ? "font-semibold" : "font-medium"}`}>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Desktop: top nav */}
      <nav className="hidden md:flex fixed top-0 inset-x-0 h-14 bg-white border-b border-[#e8e0d8] items-center px-6 gap-1 z-50">
        <span className="font-bold text-[#2d2926] mr-6">Knowho</span>
        {NAV_ITEMS.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={`text-sm font-semibold rounded-md px-3 py-1 transition-colors ${
                active
                  ? "text-[#3d6b2e] bg-[#e8f5e3]"
                  : "text-[#5a7a52] hover:text-[#3d6b2e] hover:bg-[#f0faf0]"
              }`}
            >
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
