# KNW-004 — 联系人列表页 UI 设计

**日期：** 2026-06-06
**负责人：** Sarah
**依赖：** KNW-006（GET /api/contacts ✅）、KNW-003（GET /api/tags ✅）

---

## 范围

改写 `app/people/page.tsx` 为联系人列表页，支持实时搜索和标签过滤。

---

## 架构

Client Component（`"use client"`）。页面挂载后并行调用：
- `GET /api/contacts` — 拉取所有联系人（含 tags）
- `GET /api/tags` — 拉取所有标签（用于过滤行）

搜索和标签过滤在客户端完成（`useMemo` 派生过滤结果），不额外发起 API 请求。

---

## 文件

| 文件 | 操作 | 职责 |
|------|------|------|
| `app/people/page.tsx` | 改写 | 联系人列表页（Client Component） |

---

## 页面布局

从上到下：

1. **搜索栏** — `<input>` 实时过滤联系人姓名（`contains` 匹配，大小写不敏感）
2. **标签过滤行** — 横向可滚动，显示所有标签 badge；点击切换选中状态（单选，再次点击取消）；选中标签高亮（`variant="default"`），未选为 `variant="outline"`
3. **联系人卡片列表** — 垂直排列，每张卡包含：
   - 头像：圆形，显示姓名首字符，背景色固定（`bg-[#d4c9c0]`）
   - 姓名（主文字）
   - 认识场合 `metAt`（副文字，无则不显示）
   - 标签 badge（最多显示 3 个，超出省略）
   - 整张卡可点击，跳转 `/people/:id`
4. **空状态** — 无联系人（或过滤结果为空）时显示引导文案，无联系人时附加跳转 `/new-person` 的按钮
5. **FAB** — 保留右下角"认识新朋友了？"按钮

---

## 过滤逻辑

```
filteredContacts = contacts
  .filter(c => c.name.includes(searchQuery))          // 搜索
  .filter(c => !activeTagId || c.tags.some(t => t.id === activeTagId))  // 标签
```

两个过滤条件同时生效（AND 关系）。

---

## 状态

| 状态变量 | 类型 | 说明 |
|----------|------|------|
| `contacts` | `Contact[]` | 所有联系人 |
| `tags` | `Tag[]` | 所有标签（过滤行用） |
| `searchQuery` | `string` | 搜索关键词 |
| `activeTagId` | `string \| null` | 当前选中的标签 id |
| `loading` | `boolean` | 加载中 |
| `error` | `string \| null` | 加载失败提示 |

---

## 加载与错误状态

- **加载中**：显示 3 个灰色骨架卡片（占位）
- **加载失败**：显示 error banner，不崩溃
- **空状态（无联系人）**：文案"还没有认识新朋友？" + "去记第一个人" 按钮 → `/new-person`
- **空状态（过滤结果为空）**：文案"没有匹配的联系人"，无按钮

---

## 样式

沿用已有配色：`bg-[#f7f4f1]` 背景，`text-[#2d2926]` 主文字，`text-[#8b7d72]` 副文字，`bg-[#d4c9c0]` 头像背景。

---

## 不在范围内

- 分页 / 无限滚动（P2）
- 排序切换
- 档案页（KNW-005）
- 删除联系人（在档案页操作）
