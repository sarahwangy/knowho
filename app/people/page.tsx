"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Download, Plus, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Tag {
  id: string
  name: string
  isPreset: boolean
}

interface Contact {
  id: string
  name: string
  metAt: string | null
  tags: Tag[]
  lastInteractionAt: string | null
}

export default function PeoplePage() {
  const SORT_OPTIONS = ["name-asc", "name-desc", "interaction"] as const
  type SortBy = typeof SORT_OPTIONS[number]

  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTagId, setActiveTagId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortBy>("name-asc")

  useEffect(() => {
    Promise.all([
      fetch("/api/contacts").then((r) => r.json()).catch(() => null),
      fetch("/api/tags").then((r) => r.json()).catch(() => null),
    ])
      .then(([contactsData, tagsData]) => {
        if (!contactsData) {
          setError("加载失败，请刷新重试")
        } else {
          setContacts(Array.isArray(contactsData) ? contactsData : [])
        }
        setTags(Array.isArray(tagsData) ? tagsData : [])
      })
      .finally(() => setLoading(false))
  }, [])

  const filteredContacts = useMemo(() => {
    return contacts
      .filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .filter((c) =>
        activeTagId ? c.tags.some((t) => t.id === activeTagId) : true
      )
      .sort((a, b) => {
        if (sortBy === "name-asc") return a.name.localeCompare(b.name, "zh")
        if (sortBy === "name-desc") return b.name.localeCompare(a.name, "zh")
        // interaction: most recent first, null last
        if (!a.lastInteractionAt && !b.lastInteractionAt) return 0
        if (!a.lastInteractionAt) return 1
        if (!b.lastInteractionAt) return -1
        return new Date(b.lastInteractionAt).getTime() - new Date(a.lastInteractionAt).getTime()
      })
  }, [contacts, searchQuery, activeTagId, sortBy])

  function toggleTag(tagId: string) {
    setActiveTagId((prev) => (prev === tagId ? null : tagId))
  }

  function getInitial(name: string) {
    return name.charAt(0)
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Search bar */}
      <div className="px-5 pt-6 pb-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8b7d72]" />
            <Input
              placeholder="搜索联系人…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-[#e8e0d8]"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => {
            if ((SORT_OPTIONS as readonly string[]).includes(v)) setSortBy(v as SortBy)
          }}>
            <SelectTrigger className="w-[6.5rem] bg-white border-[#e8e0d8] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">名字 A→Z</SelectItem>
              <SelectItem value="name-desc">名字 Z→A</SelectItem>
              <SelectItem value="interaction">最近互动</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-md border border-[#e8e0d8] bg-white text-[#8b7d72] hover:text-[#2d2926] shrink-0"
                aria-label="导出数据"
              >
                <Download className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => (window.location.href = "/api/export?format=json")}>
                导出 JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => (window.location.href = "/api/export?format=csv")}>
                导出 CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tag filter row */}
      {tags.length > 0 && (
        <div className="px-5 pb-3 flex gap-2 overflow-x-auto scrollbar-none">
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              className="shrink-0"
            >
              <Badge variant={activeTagId === tag.id ? "default" : "outline"}>
                {tag.name}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-5 pb-24">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm animate-pulse"
              >
                <div className="w-10 h-10 rounded-full bg-[#e8e0d8]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#e8e0d8] rounded w-1/3" />
                  <div className="h-3 bg-[#e8e0d8] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            {contacts.length === 0 ? (
              <>
                <p className="text-[#2d2926] font-medium mb-2">
                  还没有认识新朋友？
                </p>
                <p className="text-sm text-[#8b7d72] mb-6">
                  遇到有趣的人，先记下来
                </p>
                <Link
                  href="/new-person"
                  className="rounded-full bg-[#3d6b2e] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2d5520]"
                >
                  去记第一个人
                </Link>
              </>
            ) : (
              <p className="text-[#8b7d72] text-sm">没有匹配的联系人</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredContacts.map((contact) => (
              <button
                key={contact.id}
                type="button"
                onClick={() => router.push(`/people/${contact.id}`)}
                className="w-full flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <div className="w-10 h-10 rounded-full bg-[#d4c9c0] flex items-center justify-center font-bold text-[#2d2926] text-base shrink-0">
                  {getInitial(contact.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#2d2926] text-sm">
                    {contact.name}
                  </p>
                  {contact.metAt && (
                    <p className="text-xs text-[#8b7d72] mt-0.5 truncate">
                      {contact.metAt}
                    </p>
                  )}
                  {contact.tags.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {contact.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          className="text-xs py-0 px-1.5 border-[#e8e0d8] text-[#8b7d72]"
                        >
                          {tag.name}
                        </Badge>
                      ))}
                      {contact.tags.length > 3 && (
                        <span className="text-xs text-[#8b7d72]">
                          +{contact.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <Link
        href="/new-person"
        className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-[#3d6b2e] px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-[#2d5520]"
      >
        <Plus className="h-4 w-4" />
        认识新朋友了？
      </Link>
    </main>
  )
}
