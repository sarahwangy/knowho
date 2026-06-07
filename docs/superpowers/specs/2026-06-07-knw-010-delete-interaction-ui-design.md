# KNW-010 — 删除互动记录 UI 设计

**日期：** 2026-06-07
**负责人：** Sarah
**依赖：** DELETE /api/interactions/:id ✅、KNW-008（互动记录列表 ✅）

---

## 范围

修改 `app/people/[id]/page.tsx`，在每条互动记录右侧加删除按钮，确认后删除并刷新。

**不在范围内：**
- 编辑互动记录

---

## 文件

| 文件 | 操作 | 职责 |
|------|------|------|
| `app/people/[id]/page.tsx` | 修改 | 每条互动记录加删除按钮 + 删除逻辑 |

---

## 删除端点

`DELETE /api/interactions/:interactionId`
- 成功返回 204（无 body）
- 403：记录不存在或不属于当前用户

---

## 交互流程

1. 每条互动记录右侧显示 `Trash2` 图标按钮（`lucide-react`）
2. 点击 → `window.confirm("确定删除这条互动记录？")`
3. 确认 → 设置 `deletingInteractionId = interaction.id`，按钮变 disabled
4. 调 `DELETE /api/interactions/:interactionId`
5. 成功（204）→ `deletingInteractionId = null`，调 `loadContact(new AbortController().signal)` 刷新
6. 失败 → `deletingInteractionId = null`，设置 `error = "删除失败，请重试"`（复用页面顶部 error 状态）

---

## 新增状态

| 状态变量 | 类型 | 说明 |
|----------|------|------|
| `deletingInteractionId` | `string \| null` | 当前正在删除的互动记录 ID |

---

## UI 细节

- 每条互动 `<li>` 改为 flex 布局：左侧内容+日期，右侧删除按钮
- 删除按钮：`<button>` + `<Trash2 className="h-3.5 w-3.5" />`，颜色 `text-[#c0b8b0] hover:text-red-400`
- 正在删除中：`opacity-50 cursor-not-allowed`
- 错误复用现有 `setError()`，显示在页面顶部（不是 sheet 内）
