# KNW-011 — 删除重要日期 UI 设计

**日期：** 2026-06-07
**负责人：** Sarah
**依赖：** DELETE /api/contacts/:id/dates/:dateId ✅、KNW-007（重要日期列表 ✅）

---

## 范围

修改 `app/people/[id]/page.tsx`，在每条重要日期右侧加删除按钮，确认后删除并刷新。

**不在范围内：**
- 编辑重要日期

---

## 文件

| 文件 | 操作 | 职责 |
|------|------|------|
| `app/people/[id]/page.tsx` | 修改 | 每条日期加删除按钮 + 删除逻辑 |

---

## 删除端点

`DELETE /api/contacts/:contactId/dates/:dateId`
- 需要联系人 id（`id`，已在组件 scope 中）和日期 id（`d.id`）
- 成功返回 204
- 403：日期不存在或不属于该联系人

---

## 交互流程

1. 每条日期右侧显示 `Trash2` 图标按钮
2. 点击 → `window.confirm("确定删除这个日期？")`
3. 确认 → 设置 `deletingDateId = d.id`，所有日期删除按钮变 disabled（`deletingDateId !== null`）
4. 调 `DELETE /api/contacts/${id}/dates/${dateId}`
5. 成功（204）→ `deletingDateId = null`，调 `loadContact(new AbortController().signal)` 刷新
6. 失败 → `deletingDateId = null`，`setError("删除失败，请重试")`

---

## 新增状态

| 状态变量 | 类型 | 说明 |
|----------|------|------|
| `deletingDateId` | `string \| null` | 当前正在删除的日期 ID |

---

## UI 细节

- 每条日期 `<li>` 改为 flex 布局：左侧日期文字，右侧删除按钮
- 删除按钮：`<button>` + `<Trash2 className="h-3.5 w-3.5" />`，颜色 `text-[#c0b8b0] hover:text-red-400`
- 正在删除中（任意条）：`disabled={deletingDateId !== null}`，`opacity-50 cursor-not-allowed`
- `Trash2` 已在 KNW-010 中引入，无需重复导入
