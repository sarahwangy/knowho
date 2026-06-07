# KNW-012 — 联系频率设置 UI 设计

**日期：** 2026-06-07
**负责人：** Sarah
**依赖：** PATCH /api/contacts/:id（已支持 contactFreq ✅）、KNW-005（编辑 sheet ✅）

---

## 范围

修改 `app/people/[id]/page.tsx`：
1. 编辑 sheet 表单加"联系频率"字段（select）
2. 档案页头部区域展示当前频率（若有）

**不在范围内：**
- 频率提醒推送
- 联系列表按频率排序/筛选

---

## 文件

| 文件 | 操作 | 职责 |
|------|------|------|
| `app/people/[id]/page.tsx` | 修改 | 编辑 sheet + 档案头部 |

---

## Schema 变更

`editSchema` 新增字段：

```ts
contactFreq: z.string().optional(),
```

`EditValues` 类型自动更新（`z.infer`）。

---

## 编辑 Sheet

在"一句话印象"字段下方、TagPicker 上方，新增：

**联系频率**（Label + `<select>`）

```tsx
<select id="edit-contactFreq" {...register("contactFreq")} ...>
  <option value="">无</option>
  <option value="每周">每周</option>
  <option value="每两周">每两周</option>
  <option value="每月">每月</option>
  <option value="每季度">每季度</option>
</select>
```

样式与日期 sheet 的 select 一致：`rounded-md border border-input px-3 py-2 text-sm`。

---

## openEdit 变更

`reset()` 调用新增 `contactFreq` 字段：

```ts
reset({
  name: contact.name,
  metAt: contact.metAt ?? "",
  impression: contact.impression ?? "",
  contactFreq: contact.contactFreq ?? "",
})
```

---

## onEditSubmit 变更

提交时将空字符串转为 `null`：

```ts
contactFreq: data.contactFreq || null,
```

加入 PATCH body（与现有 `name`、`metAt`、`impression` 并列）。

---

## 档案页展示

在头部 `metAt` 下方，新增频率显示（若 `contact.contactFreq` 非空）：

```tsx
{contact.contactFreq && (
  <p className="text-xs text-[#8b7d72] mt-0.5">🔁 {contact.contactFreq}联系</p>
)}
```
