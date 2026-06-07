# KNW-008 — 添加互动记录 UI 设计

**日期：** 2026-06-07
**负责人：** Sarah
**依赖：** KNW-009（POST /api/contacts/:id/interactions ✅）、KNW-005（档案页 ✅）

---

## 范围

修改 `app/people/[id]/page.tsx`，启用"记录一次"按钮，弹出底部 sheet 填写互动内容和日期，提交后刷新页面。

**不在范围内：**
- 删除互动记录（P1）
- 编辑互动记录

---

## 文件

| 文件 | 操作 | 职责 |
|------|------|------|
| `app/people/[id]/page.tsx` | 修改 | 启用"记录一次"按钮 + 添加互动 sheet |

---

## 表单字段

| 字段 | 组件 | 必填 | 说明 |
|------|------|------|------|
| 内容 | Textarea | ✅ | `content`，min 1 字符 |
| 日期 | `<input type="date">` | ✅ | `date`，格式 YYYY-MM-DD，默认今天 |

## Zod Schema

```ts
const interactionSchema = z.object({
  content: z.string().min(1, "内容不能为空"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "请选择有效日期"),
})
```

---

## 提交逻辑

1. react-hook-form + zodResolver 校验
2. `POST /api/contacts/:id/interactions` with `{ content, date }`
3. 成功：关闭 sheet + 调 `loadContact(new AbortController().signal)` 刷新互动列表
4. 失败：sheet 内顶部 error banner "记录失败，请重试"，按钮恢复可点击

---

## UI

- "记录一次"按钮：移除 `disabled`，点击设置 `interactionSheetOpen = true`
- Sheet 样式：与编辑 sheet 一致（`fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl`），backdrop `fixed inset-0 bg-black/40 z-40`
- Sheet 标题："记录一次"，右侧"取消"关闭
- 日期字段使用原生 `<input type="date">`，默认值为当天（`new Date().toISOString().slice(0, 10)`）
- 提交按钮："保存中…" / "记下来"

---

## 新增状态

| 状态变量 | 类型 | 说明 |
|----------|------|------|
| `interactionSheetOpen` | `boolean` | 互动记录 sheet 是否打开 |
| `interactionError` | `string \| null` | 提交失败提示 |

互动表单用独立的 `useForm` 实例（与编辑 sheet 的 form 隔离）。
