# KNW-017 — 导航栏 + 颜色主题设计

**日期：** 2026-06-07
**负责人：** Sarah

---

## 范围

1. 新增全局导航栏（移动端底部，桌面端顶部）
2. 主色从黑色（`#2d2926`）改为鼠尾草绿（`#7a9e6a`）

**不在范围内：**
- 天气、AI、语音功能
- 底部 tab 超过两个

---

## 文件

| 文件 | 操作 |
|------|------|
| `components/nav.tsx` | 新建 — 全局导航组件 |
| `app/layout.tsx` | 修改 — 引入 Nav，加 padding |
| `app/people/page.tsx` | 修改 — 颜色替换，移除 pb-24 改 pb-20 |
| `app/dashboard/page.tsx` | 修改 — 颜色替换，移除 pb-24 改 pb-20 |
| `app/people/[id]/page.tsx` | 修改 — 颜色替换 |
| `app/new-person/page.tsx` | 修改 — 颜色替换（如存在） |

---

## 导航组件（components/nav.tsx）

### 结构

Client Component，使用 `usePathname()` 判断当前路由高亮。

两个 tab：
- **首页** — 图标 `Home`（lucide），路由 `/dashboard`
- **联系人** — 图标 `Users`（lucide），路由 `/people`

### 移动端（默认，< md）

```
fixed bottom-0 inset-x-0 h-16 bg-white border-t border-[#e8e0d8]
flex items-center justify-around
z-50
```

每个 tab：
```
flex flex-col items-center gap-0.5 py-2 px-6
icon: h-5 w-5
label: text-xs
active: text-[#7a9e6a]
inactive: text-[#8b7d72]
```

### 桌面端（≥ md）

```
hidden md:flex fixed top-0 inset-x-0 h-14 bg-white border-b border-[#e8e0d8]
items-center px-6 gap-6
z-50
```

左侧：app 名 "Knowho"（`font-bold text-[#2d2926]`）
右侧：两个链接，active 用 `text-[#7a9e6a] font-medium`，inactive 用 `text-[#8b7d72]`

---

## 颜色替换

全局把所有 `#2d2926`（按钮背景、FAB）替换为 `#7a9e6a`，hover 改为 `#6a8f5a`。

具体替换：
- `bg-[#2d2926]` → `bg-[#7a9e6a]`
- `hover:bg-[#3d3533]` → `hover:bg-[#6a8f5a]`

文字颜色 `text-[#2d2926]`（主文字）不变。

---

## Layout 修改

`app/layout.tsx` 引入 `<Nav />`，并给 `<body>` 加适当的 padding：
- 移动端：`pb-16`（底部给 nav 让位）
- 桌面端：`md:pt-14`（顶部给 nav 让位）

各 page 自身的 `pb-24` 可改为 `pb-4`（layout 已处理底部空间）。
