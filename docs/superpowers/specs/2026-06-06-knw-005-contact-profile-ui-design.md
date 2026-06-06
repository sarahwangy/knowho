# KNW-005 — 联系人档案页 UI 设计

**日期：** 2026-06-06
**负责人：** Sarah
**依赖：** KNW-006（GET/PATCH/DELETE /api/contacts/:id ✅）、KNW-003（GET /api/tags ✅）、KNW-001（TagPicker ✅）

---

## 范围

新建 `app/people/[id]/page.tsx`，展示单个联系人的完整档案，支持编辑和删除。

**不在范围内：**
- 添加互动记录（KNW-008）
- 添加重要日期（KNW-007 前端）
- 单条互动 / 日期的删除（P1）

---

## 路由

`/people/[id]` — Client Component（`"use client"`），受 middleware 保护。

---

## 文件

| 文件 | 操作 | 职责 |
|------|------|------|
| `app/people/[id]/page.tsx` | 新建 | 联系人档案页（Client Component） |

---

## 数据获取

挂载时调用 `GET /api/contacts/:id`，返回：

```ts
{
  id: string
  name: string
  metAt: string | null
  impression: string | null
  contactFreq: string | null
  tags: { id: string; name: string; isPreset: boolean }[]
  importantDates: {
    id: string; type: string; label: string | null
    month: number; day: number; year: number | null
    remindDaysBefore: number
  }[]
  interactions: {
    id: string; content: string; date: string; createdAt: string
  }[]
}
```

403 / 网络错误 → 显示错误提示，不崩溃。加载中显示 skeleton。

---

## 页面结构（单列）

### 1. 顶部导航栏
- 左：返回箭头 → `router.back()` 或 `router.push('/people')`
- 右："编辑"文字按钮 → 打开编辑 sheet

### 2. 头部
- 大头像圆形（56px），显示姓名首字符，背景 `bg-[#d4c9c0]`
- 姓名（大字加粗）
- 认识场合 `metAt`（副文字，无则不显示）

### 3. 标签
- 白色卡片，Badge 横排展示，若无标签则不渲染此卡片

### 4. 一句话印象
- 白色卡片，显示 `impression` 文字
- 若 `impression` 为空则不渲染此卡片

### 5. 重要日期
- 白色卡片，列出所有 `importantDates`
- 每条格式：`{emoji} {type} · {month}月{day}日{year ? '（' + year + '年）' : ''}`
  - 生日 → 🎂，纪念日 → 🗓️，自定义 → 📌（使用 `label`）
- 无日期时显示空状态文字"暂无重要日期"
- 底部"+ 添加日期"按钮，`disabled`（KNW-007 前端待实现），显示为灰色

### 6. 互动记录
- 白色卡片，按日期倒序列出所有 `interactions`
- 每条格式：内容文字 + 日期（`date` 字段格式化为 `YYYY-MM-DD`）
- 无记录时显示空状态文字"还没有互动记录"
- 底部"+ 记录一次"按钮，`disabled`（KNW-008 待实现），显示为灰色

### 7. 删除联系人
- 页面底部红色文字按钮"删除联系人"
- 点击调用 `window.confirm('确定删除？此操作不可撤销')`
- 确认后调 `DELETE /api/contacts/:id`，成功后 `router.push('/people')`
- 删除中按钮禁用，显示"删除中…"

---

## 编辑 Sheet

点"编辑"后，从底部滑出一个固定定位的编辑面板（`fixed inset-x-0 bottom-0`，带半透明遮罩）。

**可编辑字段：**
- 姓名（Input，必填）
- 认识场合（Input，可选）
- 一句话印象（Textarea，可选）
- 标签（TagPicker，复用 `components/tag-picker.tsx`）

**提交逻辑：**
1. 用 `react-hook-form` + zod 校验（与 new-person 页相同 schema）
2. 标签分离为 `tagIds`（有 id）和 `newTags`（无 id，名称）
3. 先调 `PATCH /api/contacts/:id`（更新标量字段 + tagIds）
4. 若有 `newTags`，先通过 `POST /api/contacts`（创建联系人时会 upsert 标签）——不对，直接在 PATCH body 中无法传 newTags。

   **实际方案：** TagPicker 返回 `SelectedTag[]`。提交时：
   - 有 id 的 → `tagIds` 传给 PATCH
   - 无 id 的 → 先逐一调 `POST /api/tags`（创建新标签，获取 id），再把新 id 加入 `tagIds`，最后调 PATCH

5. 成功后关闭 sheet，重新调 `GET /api/contacts/:id` 刷新数据
6. 失败显示 sheet 内 error banner

**关闭方式：** 点遮罩或"取消"按钮关闭，不保存。

---

## 状态

| 状态变量 | 类型 | 说明 |
|----------|------|------|
| `contact` | `Contact \| null` | 联系人数据 |
| `loading` | `boolean` | 初始加载 |
| `error` | `string \| null` | 加载失败提示 |
| `editOpen` | `boolean` | 编辑 sheet 是否打开 |
| `deleting` | `boolean` | 删除进行中 |

---

## 样式

沿用配色：`bg-[#f7f4f1]` 背景，`text-[#2d2926]` 主文字，`text-[#8b7d72]` 副文字，白色卡片 `bg-white rounded-xl shadow-sm`。
