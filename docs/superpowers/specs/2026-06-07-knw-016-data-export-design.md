# KNW-016 — 数据导出设计

**日期：** 2026-06-07
**负责人：** Sarah

---

## 范围

支持导出用户全部联系人数据，格式为 JSON（完整结构）和 CSV（扁平表格）。

**不在范围内：**
- 导入功能
- 选择性导出（部分联系人）
- 定时自动导出
- ZIP 打包

---

## 文件

| 文件 | 操作 | 职责 |
|------|------|------|
| `app/api/export/route.ts` | 新建 | GET 端点，返回 JSON 或 CSV 文件下载 |
| `app/people/page.tsx` | 修改 | 加导出下拉按钮，触发浏览器下载 |

---

## API：GET /api/export

### 请求

```
GET /api/export?format=json
GET /api/export?format=csv
```

`format` 参数缺失或非法时返回 400。

### 认证

需要 session，未登录返回 401。

### 响应头

```
Content-Type: application/json            (JSON)
Content-Type: text/csv; charset=utf-8     (CSV)
Content-Disposition: attachment; filename="knowho-export-YYYY-MM-DD.json"
Content-Disposition: attachment; filename="knowho-export-YYYY-MM-DD.csv"
```

日期取服务器当前 UTC 日期，格式 `YYYY-MM-DD`（`new Date().toISOString().slice(0, 10)`）。

### JSON 结构

```ts
{
  exportedAt: string          // ISO 时间戳
  contacts: {
    id: string
    name: string
    metAt: string | null
    impression: string | null
    contactFreq: string | null
    createdAt: string         // ISO
    tags: { id: string; name: string }[]
    interactions: {
      id: string
      date: string            // ISO
      type: string | null
      content: string | null
    }[]
    importantDates: {
      id: string
      type: string            // "生日" | "纪念日" | "自定义"
      label: string | null
      month: number
      day: number
      year: number | null
    }[]
  }[]
}
```

### CSV 结构

表头行 + 每联系人一行，字段顺序：

```
姓名,认识于,印象,联系频率,标签,最近互动日期,互动次数,重要日期数
```

- **标签**：多个标签用 `|` 分隔（如 `朋友|同事`），无标签为空字符串
- **最近互动日期**：ISO 日期字符串（`YYYY-MM-DD`），无互动为空字符串
- **字段含特殊字符**（逗号、换行、双引号）时用双引号包裹，内部双引号转义为 `""`

### Prisma 查询

```ts
prisma.contact.findMany({
  where: { userId, deletedAt: null },
  include: {
    tags: { select: { id: true, name: true } },
    interactions: {
      orderBy: { date: "desc" },
      select: { id: true, date: true, type: true, content: true },
    },
    importantDates: {
      select: { id: true, type: true, label: true, month: true, day: true, year: true },
    },
  },
  orderBy: { createdAt: "asc" },
})
```

---

## UI：app/people/page.tsx

### 导出按钮位置

搜索栏行（`pt-6` 区域）左侧新增一个图标按钮，使用 shadcn `DropdownMenu`：

```
[ 🔍 搜索联系人…        ] [ 名字A→Z▾ ] [ ↓ ]
```

最右侧 `↓`（`Download` icon，lucide-react）点击展开下拉：
- 导出 JSON
- 导出 CSV

### 下载触发

点击菜单项后执行：

```ts
window.location.href = `/api/export?format=json`
window.location.href = `/api/export?format=csv`
```

浏览器收到 `Content-Disposition: attachment` 响应后自动下载，无需 fetch + Blob。

### shadcn 组件

需要 `DropdownMenu`：`npx shadcn@latest add dropdown-menu`（若不存在）。
