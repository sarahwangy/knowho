# KNW-001 — 添加联系人表单 UI 设计

**日期：** 2026-06-06
**负责人：** Sarah
**依赖：** KNW-002（POST /api/contacts ✅）、KNW-003（GET /api/tags ✅）

---

## 范围

实现"添加联系人"表单页面，包含：
- 页面路由 `app/new-person/page.tsx`
- 可复用标签选择器组件 `components/tag-picker.tsx`

---

## 路由

`/new-person` — 客户端组件（`"use client"`），受认证保护（middleware 已配置）

---

## 新增依赖

```bash
npm install react-hook-form @hookform/resolvers
npx shadcn add input textarea label badge
```

---

## 组件结构

```
app/new-person/
  page.tsx              # 表单页面（Client Component）

components/
  tag-picker.tsx        # 标签多选组件（独立，供档案编辑页复用）
```

---

## TagPicker 组件

**文件：** `components/tag-picker.tsx`

**Props：**
```ts
interface TagPickerProps {
  value: { id?: string; name: string }[]  // 已选标签（含新建的无id标签）
  onChange: (tags: { id?: string; name: string }[]) => void
}
```

**行为：**
- 挂载时调用 `GET /api/tags` 拉取用户所有标签
- 已有标签以 Badge 展示（两行）：点击 toggle 选中/取消
  - 选中：填色 badge（`variant="default"`）
  - 未选：边框 badge（`variant="outline"`）
- 底部文本输入框，输入新标签名后按 Enter 或点"+"按钮：
  - 将新标签加入已选列表（无 id，通过 `newTags` 提交时 upsert）
  - 空字符串不允许添加
- 加载中显示 skeleton（3个灰色 badge 占位）
- API 失败时静默降级（显示空标签列表，用户仍可手动输入新标签）

---

## 表单页面

**文件：** `app/new-person/page.tsx`

### 字段

| 字段 | 组件 | 必填 | 说明 |
|------|------|------|------|
| 姓名 | Input | ✅ | `autoFocus`，打开即可输入 |
| 认识场合 | Input | ❌ | placeholder: "在哪儿认识的？" |
| 一句话印象 | Textarea | ❌ | placeholder: "让你记住 Ta 的那件事" |
| 标签 | TagPicker | ❌ | 多选，可新建 |
| 语音备注 | 灰色占位按钮 🎤 | — | P1，disabled 状态 |

### Zod Schema

```ts
const schema = z.object({
  name: z.string().min(1, "姓名不能为空"),
  metAt: z.string().optional(),
  impression: z.string().optional(),
})
```

标签不通过 react-hook-form 管理，用独立 `useState` 存储已选标签数组。

### 提交逻辑

1. `handleSubmit` 触发 zod 校验
2. 从已选标签分离：有 id 的 → `tagIds`，无 id 的 → `newTags`（名称数组）
3. `POST /api/contacts` with `{ name, metAt, impression, tagIds, newTags }`
4. 成功：`router.push('/people/' + contact.id)` （KNW-005 未完成时暂跳 `/people`）
5. 失败：页面顶部显示 error banner，保留已填内容，按钮恢复可点击

### 错误状态

- name 为空：Input 下方红字 inline 提示，不提交
- API 失败：顶部 `<div>` error banner（非 toast，避免额外依赖）
- 提交中：按钮显示"保存中…"并 `disabled`

### 样式

沿用项目已有配色（`bg-[#f7f4f1]` 背景，`text-[#2d2926]` 主文字，`text-[#8b7d72]` 副文字），移动端（375px）一屏内完成无需滚动。

---

## 不在范围内

- 语音备注实现 — KNW-011（P1）
- 档案页 — KNW-005
- 编辑联系人表单 — 复用本组件，在 KNW-005 中实现
