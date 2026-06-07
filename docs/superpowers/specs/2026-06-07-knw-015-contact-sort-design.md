# KNW-015 — 联系人排序设计

**日期：** 2026-06-07
**负责人：** Sarah

---

## 范围

在联系人列表页（`/people`）加入排序功能：按姓名升序、姓名降序、最近互动时间。

**不在范围内：**
- 服务端排序（数据量小，客户端排序足够）
- 新增排序字段（如认识时间、联系频率）
- 分页

---

## 文件

| 文件 | 操作 | 职责 |
|------|------|------|
| `app/api/contacts/route.ts` | 修改 | GET 响应加入 `lastInteractionAt` 字段 |
| `app/people/page.tsx` | 修改 | 加 sortBy 状态、排序逻辑、排序 UI |

---

## API 变更：GET /api/contacts

### 新增字段

在返回的每个 contact 对象中加入：

```ts
lastInteractionAt: string | null  // ISO 日期字符串，null = 从未互动
```

### 实现方式

在 Prisma query 的 include 里加入最近一条互动：

```ts
include: {
  tags: { select: { id: true, name: true, isPreset: true } },
  interactions: {
    orderBy: { date: "desc" },
    take: 1,
    select: { date: true },
  },
}
```

返回前 map 成扁平结构：

```ts
return NextResponse.json(
  contacts.map((c) => ({
    ...c,
    lastInteractionAt: c.interactions[0]?.date.toISOString() ?? null,
    interactions: undefined,  // 不暴露原始 interactions 数组
  }))
)
```

---

## 页面变更：app/people/page.tsx

### Contact interface 新增字段

```ts
interface Contact {
  id: string
  name: string
  metAt: string | null
  tags: Tag[]
  lastInteractionAt: string | null  // 新增
}
```

### 新增 sortBy 状态

```ts
const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "interaction">("name-asc")
```

### filteredContacts useMemo 加入排序步骤

在现有 filter 链后追加 sort：

```ts
.sort((a, b) => {
  if (sortBy === "name-asc") return a.name.localeCompare(b.name, "zh")
  if (sortBy === "name-desc") return b.name.localeCompare(a.name, "zh")
  // interaction: 有日期的降序，null 排末尾
  if (!a.lastInteractionAt && !b.lastInteractionAt) return 0
  if (!a.lastInteractionAt) return 1
  if (!b.lastInteractionAt) return -1
  return new Date(b.lastInteractionAt).getTime() - new Date(a.lastInteractionAt).getTime()
})
```

### 排序 UI

在搜索框右侧加一个 shadcn `Select`，与搜索框同行（flex row）：

```tsx
<div className="flex gap-2">
  <div className="relative flex-1">
    {/* 搜索框（现有） */}
  </div>
  <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
    <SelectTrigger className="w-[100px] bg-white border-[#e8e0d8] shrink-0">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="name-asc">名字 A→Z</SelectItem>
      <SelectItem value="name-desc">名字 Z→A</SelectItem>
      <SelectItem value="interaction">最近互动</SelectItem>
    </SelectContent>
  </Select>
</div>
```

### shadcn 组件

需要从 shadcn/ui 引入 `Select`：
```ts
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
```

若 `components/ui/select.tsx` 不存在，需先运行 `npx shadcn@latest add select`。

---

## 排序规则

| sortBy | 规则 |
|--------|------|
| `name-asc` | `localeCompare(zh)` 升序 |
| `name-desc` | `localeCompare(zh)` 降序 |
| `interaction` | lastInteractionAt 降序，null 排末尾 |

默认排序：`name-asc`（A→Z）。
