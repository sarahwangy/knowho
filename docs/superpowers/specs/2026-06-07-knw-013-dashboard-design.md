# KNW-013 — 首页 Dashboard 设计

**日期：** 2026-06-07
**负责人：** Sarah

---

## 范围

新增 Dashboard 作为登录后首页，展示数据摘要、即将到来的重要日期、久未联系的人。

**不在范围内：**
- 底部 tab 导航栏
- 推送通知
- 频率智能判断（久未联系固定用 30 天阈值）

---

## 文件

| 文件 | 操作 | 职责 |
|------|------|------|
| `app/api/dashboard/route.ts` | 新建 | GET 端点，返回聚合数据 |
| `app/dashboard/page.tsx` | 新建 | Dashboard 页面（Client Component） |
| `app/page.tsx` | 修改 | 登录后重定向改为 `/dashboard` |

---

## API：GET /api/dashboard

### 认证
需要 session，未登录返回 401。

### 返回结构

```ts
{
  totalContacts: number
  thisMonthInteractions: number       // 当月（按 date 字段）互动条数
  upcomingDatesCount: number          // 未来 30 天内重要日期条数
  upcomingDates: {
    contactId: string
    contactName: string
    type: string                      // 显示用：生日/纪念日/label（自定义）
    daysUntil: number                 // 0 = 今天，1 = 明天，…
  }[]                                 // 最多 5 条，按 daysUntil 升序
  neglectedContacts: {
    id: string
    name: string
    daysSince: number | null          // null = 从未有过互动记录
  }[]                                 // 最多 5 人，按 daysSince 降序（null 排最后）
}
```

### 计算逻辑

**本月互动数：**
```ts
// 当月第一天 00:00:00
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
prisma.interaction.count({
  where: { contact: { userId }, date: { gte: startOfMonth } }
})
```

**即将到来的日期（daysUntil 算法）：**
- 取该联系人所有 `importantDates`
- 对每条日期，构造"今年的日期"：`new Date(currentYear, month-1, day)`
- 若已过（< today），改用明年：`new Date(currentYear+1, month-1, day)`
- `daysUntil = Math.ceil((target - today) / 86400000)`
- 仅保留 `daysUntil <= 30`
- `type` 显示值：`生日` → "生日"，`纪念日` → "纪念日"，`自定义` → `label`（fallback "自定义"）

**久未联系（neglectedContacts）：**
- 取所有联系人，对每人找最近一条互动（按 date 降序取第一条）
- 若无互动 OR 最近互动距今 > 30 天 → 入选
- `daysSince`：有互动 → `Math.floor((today - lastInteractionDate) / 86400000)`，无互动 → `null`
- 按 `daysSince` 降序，null 排末尾，取前 5

---

## Dashboard 页面（app/dashboard/page.tsx）

### 路由
`/dashboard` — Client Component（`"use client"`），受 middleware 保护。

### 数据获取
挂载时调用 `GET /api/dashboard`，带 AbortController。加载中显示 skeleton，失败显示 error banner。

### 页面结构（从上到下）

1. **问候语**
   - 根据当前小时判断：0–11 → "早上好"，12–17 → "下午好"，18–23 → "晚上好"
   - 用户名从 session 获取（`useSession` 或从 API 返回）
   - 副文字：`共 N 位联系人`

2. **统计卡片（2列）**
   - 本月互动 / 近期日期数

3. **即将到来卡片**（仅当 `upcomingDates.length > 0` 时渲染）
   - 每行：emoji + 联系人名·类型 + 右侧"N天后"（0天→"今天"，1天→"明天"）
   - 点击整行跳转到该联系人档案页

4. **久未联系卡片**（仅当 `neglectedContacts.length > 0` 时渲染）
   - 每行：头像首字 + 姓名 + 右侧"N天前" / "从未联系"
   - 点击整行跳转到该联系人档案页

5. **底部入口**
   - "查看所有联系人 →" 链接到 `/people`
   - FAB（右下角 `+`）链接到 `/new-person`，与 `/people` 页风格一致

### Skeleton（加载中）
- 问候区域：两行色块
- 统计：两个矩形卡片
- 两个较高的矩形卡片

---

## app/page.tsx 修改

```ts
redirect(session ? "/dashboard" : "/login")
```

---

## 样式

沿用全局配色：`bg-[#f7f4f1]` 背景，`text-[#2d2926]` 主文字，`text-[#8b7d72]` 副文字，白色卡片 `bg-white rounded-xl shadow-sm`，FAB `bg-[#2d2926]`。
