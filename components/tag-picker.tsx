"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Tag {
  id: string
  name: string
  isPreset: boolean
}

export interface SelectedTag {
  id?: string
  name: string
}

interface TagPickerProps {
  value: SelectedTag[]
  onChange: (tags: SelectedTag[]) => void
}

export function TagPicker({ value, onChange }: TagPickerProps) {
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [newTagInput, setNewTagInput] = useState("")

  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/tags", { signal: controller.signal })
      .then((r) => r.json())
      .then((tags: Tag[]) => setAvailableTags(tags))
      .catch((err) => {
        if (err.name !== "AbortError") {
          // silent degradation — user can still type new tags
        }
      })
    return () => controller.abort()
  }, [])

  function isSelected(tag: Tag) {
    return value.some((v) => v.id === tag.id || v.name === tag.name)
  }

  function toggleTag(tag: Tag) {
    if (isSelected(tag)) {
      onChange(value.filter((v) => v.id !== tag.id || v.name !== tag.name))
    } else {
      onChange([...value, { id: tag.id, name: tag.name }])
    }
  }

  function addNewTag() {
    const trimmed = newTagInput.trim()
    if (!trimmed) return
    if (value.some((v) => v.name === trimmed)) {
      setNewTagInput("")
      return
    }
    onChange([...value, { name: trimmed }])
    setNewTagInput("")
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      addNewTag()
    }
  }

  return (
    <div className="space-y-3">
      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag)}
            >
              <Badge variant={isSelected(tag) ? "default" : "outline"}>
                {tag.name}
              </Badge>
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          placeholder="添加新标签…"
          value={newTagInput}
          onChange={(e) => setNewTagInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-8 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addNewTag}
          className="h-8 px-2"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
