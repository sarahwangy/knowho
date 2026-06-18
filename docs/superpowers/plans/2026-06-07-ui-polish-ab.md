# UI Polish A+B Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish UI across the app — nav bold/hover, lighter gradient background, AI FAB to right-center, edit/date modals centered, dates sorted as table, dashboard stats clickable, weather bigger with animation.

**Architecture:** Pure UI changes across existing files. No new API routes or DB changes needed.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4

---

## File Map

| File | Change |
|------|--------|
| `components/nav.tsx` | Bold text, hover highlight transition |
| `app/layout.tsx` | Lighter green gradient background |
| `app/globals.css` | Weather emoji animations |
| `components/ai-assistant.tsx` | Move FAB to right side, vertically centered |
| `app/people/page.tsx` | Move add-contact FAB higher |
| `app/people/[id]/page.tsx` | Edit button styled, modals centered, dates sorted table |
| `app/dashboard/page.tsx` | Stats cards clickable, weather bigger |

---

### Task 1: Nav bold + hover, background gradient

**Files:**
- Modify: `components/nav.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Read both files**

Read `components/nav.tsx` and `app/layout.tsx`.

- [ ] **Step 2: Update nav.tsx**

Desktop nav links: add `font-semibold` to all items (active and inactive), add `hover:text-[#3d6b2e] transition-colors` to inactive links, and a `hover:bg-[#f0faf0] rounded-md px-3 py-1 transition-colors` hover pill effect.

Active link on desktop: `text-[#3d6b2e] font-semibold bg-[#e8f5e3] rounded-md px-3 py-1`
Inactive link on desktop: `text-[#5a7a52] font-semibold hover:text-[#3d6b2e] hover:bg-[#f0faf0] rounded-md px-3 py-1 transition-colors`

Mobile bottom nav: add `transition-colors` to each link, active stays `text-[#3d6b2e]`, inactive `text-[#8b7d72] hover:text-[#3d6b2e]`. Add `font-medium` to the label span for active items.

Full updated `components/nav.tsx`:
```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Users, Calendar } from "lucide-react"

const NAV_ITEMS = [
  { href: "/dashboard", label: "首页", icon: Home },
  { href: "/people", label: "联系人", icon: Users },
  { href: "/calendar", label: "日历", icon: Calendar },
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
```

- [ ] **Step 3: Update layout.tsx background**

In `app/layout.tsx`, change the body className from `bg-[#7a9e6a]` to use a gradient:
```
bg-gradient-to-br from-[#b2d0a0] via-[#8ab87a] to-[#5a8a50]
```

The full className should be:
```
${geist.className} pb-16 md:pt-14 bg-gradient-to-br from-[#b2d0a0] via-[#8ab87a] to-[#5a8a50] min-h-screen
```

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/nav.tsx app/layout.tsx && git commit -m "feat(ui): bold nav, hover highlights, lighter gradient background"
```

---

### Task 2: AI FAB to right-center, add-contact FAB higher

**Files:**
- Modify: `components/ai-assistant.tsx`
- Modify: `app/people/page.tsx`

- [ ] **Step 1: Read both files**

Read `components/ai-assistant.tsx` and `app/people/page.tsx`.

- [ ] **Step 2: Move AI FAB to right side, vertically centered**

In `components/ai-assistant.tsx`, find the FAB button. It currently has className including `fixed bottom-20 left-4 md:bottom-6`. 

Change to position it on the right side, vertically centered:
```
fixed right-4 top-1/2 -translate-y-1/2 z-40
```

Also update the label text from whatever it currently says to show "AI" more clearly. Change the button to be a vertical pill:
```tsx
<button
  onClick={() => setOpen(true)}
  className="fixed right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1 rounded-full bg-[#3d6b2e] px-3 py-4 text-white shadow-lg hover:bg-[#2d5520] transition-colors"
  aria-label="AI 助手"
>
  <Sparkles className="h-5 w-5" />
  <span className="text-xs font-medium writing-mode-vertical" style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>AI</span>
</button>
```

Actually keep it simple — just a round button on the right:
```tsx
<button
  onClick={() => setOpen(true)}
  className="fixed right-4 top-1/2 -translate-y-1/2 z-40 flex items-center justify-center w-12 h-12 rounded-full bg-[#3d6b2e] text-white shadow-lg hover:bg-[#2d5520] transition-colors"
  aria-label="AI 助手"
>
  <Sparkles className="h-5 w-5" />
</button>
```

- [ ] **Step 3: Move add-contact FAB in people page**

In `app/people/page.tsx`, find the FAB Link at the bottom. It currently has `className="fixed bottom-6 right-6 ..."`.

On mobile, the bottom nav is 64px (h-16). The button should be above the nav. Change:
- Mobile: `bottom-20` (above the 64px nav + gap)
- Desktop: `bottom-8`

Update the className:
```
fixed bottom-20 md:bottom-8 right-4 md:right-6 flex items-center gap-2 rounded-full bg-[#3d6b2e] px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-[#2d5520] transition-colors
```

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add components/ai-assistant.tsx app/people/page.tsx && git commit -m "feat(ui): move AI FAB to right-center, add-contact FAB higher"
```

---

### Task 3: Contact detail page — edit button, centered modals, sorted dates table

**Files:**
- Modify: `app/people/[id]/page.tsx`

This is the largest task. Read the file first, then make all changes.

- [ ] **Step 1: Read the current file**

Read `/Users/sha/Code/AI-code-26/5-konwho/app/people/[id]/page.tsx`.

- [ ] **Step 2: Style the "编辑" button as a proper button**

Find the edit button near the top of the JSX (inside the return):
```tsx
<button
  onClick={openEdit}
  className="text-sm text-[#2d2926] font-medium"
>
  编辑
</button>
```

Replace with:
```tsx
<button
  onClick={openEdit}
  className="text-sm font-semibold text-white bg-[#3d6b2e] hover:bg-[#2d5520] rounded-full px-4 py-1.5 transition-colors"
>
  编辑
</button>
```

- [ ] **Step 3: Sort importantDates by month+day and display as table**

Find the `{/* Important dates */}` section. Currently it maps over `contact.importantDates` unsorted.

Before the map, sort by month then day. Also change the list display to a table-like layout with a date column and label column.

Replace the `<ul>` section inside the important dates card with:
```tsx
{contact.importantDates.length === 0 ? (
  <p className="text-sm text-[#8b7d72]">暂无重要日期</p>
) : (
  <table className="w-full text-sm">
    <tbody>
      {[...contact.importantDates]
        .sort((a, b) => a.month !== b.month ? a.month - b.month : a.day - b.day)
        .map((d) => (
          <tr key={d.id} className="border-b border-[#f0ebe6] last:border-0">
            <td className="py-2 pr-3 text-[#8b7d72] whitespace-nowrap font-medium w-24">
              {d.month}月{d.day}日
            </td>
            <td className="py-2 flex-1 text-[#2d2926]">
              {dateEmoji(d.type)} {d.type === "自定义" ? (d.label ?? "自定义") : d.type}
              {d.year && <span className="text-[#8b7d72] text-xs ml-1">({d.year}年)</span>}
            </td>
            <td className="py-2 pl-2 text-right">
              <button
                type="button"
                onClick={() => handleDeleteDate(d.id)}
                disabled={deletingDateId !== null}
                title="删除日期"
                className="text-[#c0b8b0] hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </td>
          </tr>
        ))}
    </tbody>
  </table>
)}
```

- [ ] **Step 4: Convert edit sheet to centered modal**

Find the `{/* Edit sheet */}` section. It currently uses `fixed inset-x-0 bottom-0` (bottom sheet).

Change the inner div from:
```tsx
<div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl px-5 pt-5 pb-10 max-h-[85vh] overflow-y-auto">
```
To a centered modal:
```tsx
<div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl px-5 pt-5 pb-6 w-[calc(100%-2rem)] max-w-md max-h-[85vh] overflow-y-auto shadow-2xl">
```

- [ ] **Step 5: Convert add date sheet to centered modal**

Find the `{/* Date sheet */}` section. Same transformation:

Change:
```tsx
<div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl px-5 pt-5 pb-10 max-h-[85vh] overflow-y-auto">
```
To:
```tsx
<div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl px-5 pt-5 pb-6 w-[calc(100%-2rem)] max-w-md max-h-[85vh] overflow-y-auto shadow-2xl">
```

- [ ] **Step 6: TypeScript check**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/people/\[id\]/page.tsx && git commit -m "feat(ui): styled edit button, centered modals, dates sorted as table"
```

---

### Task 4: Dashboard stats clickable + weather bigger + animation

**Files:**
- Modify: `app/dashboard/page.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Read both files**

Read `app/dashboard/page.tsx` and `app/globals.css`.

- [ ] **Step 2: Make stats cards clickable**

In `app/dashboard/page.tsx`, find the stats cards section (本月互动 and 近期日期). These are currently `<div>` elements inside a grid.

The dashboard uses `const router = useRouter()` already.

Wrap each stat card in a clickable button or make the div a button:

For 本月互动 (thisMonthInteractions): clicking navigates to `/people`
For 近期日期 (upcomingDatesCount): clicking navigates to `/calendar`

Find the two stat card divs and change them to:
```tsx
<button
  type="button"
  onClick={() => router.push("/people")}
  className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow text-left w-full"
>
  <p className="text-sm text-[#8b7d72]">本月互动</p>
  <p className="text-3xl font-bold text-[#2d2926] mt-1">{data.thisMonthInteractions}</p>
</button>
```

```tsx
<button
  type="button"
  onClick={() => router.push("/calendar")}
  className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow text-left w-full"
>
  <p className="text-sm text-[#8b7d72]">近期日期</p>
  <p className="text-3xl font-bold text-[#2d2926] mt-1">{data.upcomingDatesCount}</p>
</button>
```

Keep all the existing content (numbers etc) but just wrap in button.

- [ ] **Step 3: Make weather display bigger**

Find the weather display in the greeting section:
```tsx
{weather && (
  <div className="text-right shrink-0">
    <p className="text-sm text-white">
      {weatherEmoji(weather.icon)} {weather.temp}°
    </p>
    <p className="text-xs text-white/70">{weather.city}</p>
  </div>
)}
```

Change to larger display:
```tsx
{weather && (
  <div className="text-right shrink-0">
    <p className="text-2xl text-white font-light flex items-center gap-1 justify-end">
      <span className="weather-icon">{weatherEmoji(weather.icon)}</span>
      <span>{weather.temp}°</span>
    </p>
    <p className="text-xs text-white/80 mt-0.5">{weather.city}</p>
  </div>
)}
```

- [ ] **Step 4: Add weather icon animations to globals.css**

Read `app/globals.css` first. Then append these keyframe animations and the `.weather-icon` utility class:

```css
/* Weather icon animations */
@keyframes weather-float {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(4px); }
}

@keyframes weather-pulse-sun {
  0%, 100% { transform: scale(1); filter: brightness(1); }
  50% { transform: scale(1.15); filter: brightness(1.3); }
}

@keyframes weather-drip {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(3px); }
}

.weather-icon {
  display: inline-block;
}

/* Cloud / fog: float side to side */
.weather-icon:has-text,
[data-weather="cloud"] .weather-icon,
.weather-icon[data-icon^="02"],
.weather-icon[data-icon^="03"],
.weather-icon[data-icon^="04"],
.weather-icon[data-icon^="50"] {
  animation: weather-float 3s ease-in-out infinite;
}
```

Actually, since we can't use has-text or data attributes easily with emoji, let's apply animation based on icon code directly in the component. 

Instead, add these keyframes to globals.css:
```css
@keyframes weather-float {
  0%, 100% { transform: translateX(0px); }
  50% { transform: translateX(4px); }
}

@keyframes weather-sun-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

@keyframes weather-rain-drip {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(3px); }
}
```

And in `dashboard/page.tsx`, update `weatherEmoji` to return both the emoji and an animation class. Create a new helper:

```tsx
function weatherAnimation(icon: string): string {
  const code = icon.slice(0, 2)
  if (code === "01") return "animate-[weather-sun-pulse_2s_ease-in-out_infinite]"
  if (["02", "03", "04", "50"].includes(code)) return "animate-[weather-float_3s_ease-in-out_infinite]"
  if (["09", "10", "11"].includes(code)) return "animate-[weather-rain-drip_1.5s_ease-in-out_infinite]"
  return ""
}
```

Then in the JSX:
```tsx
<span className={`inline-block ${weatherAnimation(weather.icon)}`}>{weatherEmoji(weather.icon)}</span>
```

- [ ] **Step 5: TypeScript check**

```bash
cd /Users/sha/Code/AI-code-26/5-konwho && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/page.tsx app/globals.css && git commit -m "feat(ui): clickable stat cards, bigger animated weather widget"
```
