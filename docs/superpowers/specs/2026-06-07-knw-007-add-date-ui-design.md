# KNW-007 — 添加重要日期 UI 设计

**日期：** 2026-06-07
**负责人：** Sarah
**依赖：** KNW-009（POST /api/contacts/:id/dates ✅）、KNW-005（档案页 ✅）

---

## 范围

修改 `app/people/[id]/page.tsx`，启用"添加日期"按钮，弹出底部 sheet 填写重要日期，提交后刷新页面。

**不在范围内：**
- 删除重要日期（P1）
- 编辑重要日期（P1）
- 提醒天数设置（固定传 3）

---

## 文件

| 文件 | 操作 | 职责 |
|------|------|------|
| `app/people/[id]/page.tsx` | 修改 | 启用"添加日期"按钮 + 添加日期 sheet |

---

## 表单字段

| 字段 | 组件 | 必填 | 说明 |
|------|------|------|------|
| 类型 | `<select>` | ✅ | 生日 / 纪念日 / 自定义 |
| 自定义标签 | Input | 条件必填 | 仅当 type === "自定义" 时显示且必填 |
| 月 | `<select>` 1–12 | ✅ | 数字，提交时转为 number |
| 日 | `<select>` 1–31 | ✅ | 数字，提交时转为 number |
| 年份 | `<input type="number">` | ❌ | 可选，留空则不传 |

## Zod Schema

```ts
const dateSchema = z.object({
  type: z.enum(["生日", "纪念日", "自定义"]),
  label: z.string().optional(),
  month: z.string().min(1, "请选择月份"),
  day: z.string().min(1, "请选择日期"),
  year: z.string().optional(),
}).superRefine((val, ctx) => {
  if (val.type === "自定义" && !val.label?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "请填写标签", path: ["label"] })
  }
})
```

月/日/年存为 string（因为 select/input 返回 string），提交时转换为 number。

---

## 提交逻辑

1. react-hook-form + zodResolver 校验
2. 构建 body：
   - `type`：直接使用
   - `label`：type === "自定义" 时传入，否则不传
   - `month`：`parseInt(data.month)`
   - `day`：`parseInt(data.day)`
   - `year`：`data.year ? parseInt(data.year) : undefined`
   - `remindDaysBefore`：固定为 `3`
3. `POST /api/contacts/:id/dates`
4. 成功：关闭 sheet + 调 `loadContact(new AbortController().signal)` 刷新
5. 失败：sheet 内顶部 error banner "添加失败，请重试"

---

## UI

- "添加日期"按钮：移除 `disabled`，点击设置 `dateSheetOpen = true`
- Sheet 样式：与编辑/互动 sheet 一致（`fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl`），backdrop `fixed inset-0 bg-black/40 z-40`
- Sheet 标题："添加日期"，右侧"取消"关闭
- 类型 select：使用原生 `<select>`，与日期 input 样式一致（`rounded-md border px-3 py-2 text-sm`）
- 自定义标签 Input：仅 type === "自定义" 时渲染（由 `watch("type")` 控制）
- 月/日 select：原生 `<select>`，月显示"1月"–"12月"，日显示"1日"–"31日"
- 年份 input：`<input type="number" placeholder="可选">`
- 提交按钮："添加中…" / "添加"

---

## 新增状态

| 状态变量 | 类型 | 说明 |
|----------|------|------|
| `dateSheetOpen` | `boolean` | 日期 sheet 是否打开 |
| `dateError` | `string \| null` | 提交失败提示 |

日期表单用独立的 `useForm` 实例（与编辑 sheet、互动 sheet 的 form 隔离）。

需要使用 `watch("type")` 监听类型字段，控制自定义标签的显示/隐藏。
