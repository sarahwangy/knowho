# KNW-006 — 联系人查询/更新/删除 API 设计

**日期：** 2026-06-06
**负责人：** Sarah
**依赖：** KNW-002（POST /api/contacts 已完成）、Prisma Schema（已完成）

---

## 范围

实现联系人的读取、更新、软删除接口：

- `GET /api/contacts` — 列表（支持筛选）
- `GET /api/contacts/:id` — 单个，含完整嵌套数据
- `PATCH /api/contacts/:id` — 部分更新
- `DELETE /api/contacts/:id` — 软删除

---

## 文件结构

```
app/api/
  contacts/
    route.ts          # 已有 POST，新增 GET
    [id]/
      route.ts        # 新建：GET, PATCH, DELETE
```

---

## GET /api/contacts — 列表

**Query 参数（均可选）：**
- `tagId` — 按标签 ID 筛选（单个）
- `search` — 姓名模糊匹配（Prisma `contains`，`mode: "insensitive"`）

**逻辑：**
- 只返回当前用户的联系人（`userId = session.user.id`）
- 过滤软删除（`deletedAt: null`）
- 含 `tags`（`id, name, isPreset`）
- 按 `createdAt` 倒序

**Response 200:**
```json
[
  {
    "id": "...",
    "name": "阿伟",
    "metAt": "读书会",
    "impression": "喜欢骑行",
    "contactFreq": null,
    "createdAt": "...",
    "tags": [{ "id": "...", "name": "社群", "isPreset": false }]
  }
]
```

---

## GET /api/contacts/:id — 单个

**逻辑：**
- 查询 `where: { id, userId }` — 不存在或他人联系人统一返回 `403`（不泄露是否存在）
- 软删除的联系人同样返回 `403`（对前端透明）
- 返回完整嵌套：`tags` + `importantDates` + `interactions`
- `interactions` 按 `date` 倒序，同日按 `createdAt` 倒序

**Response 200:**
```json
{
  "id": "...",
  "name": "阿伟",
  "metAt": "读书会",
  "impression": "喜欢骑行",
  "contactFreq": null,
  "createdAt": "...",
  "deletedAt": null,
  "tags": [...],
  "importantDates": [...],
  "interactions": [...]
}
```

---

## PATCH /api/contacts/:id — 部分更新

**可更新字段（全部可选）：**
- `name` — 字符串，非空
- `metAt` — 字符串或 null
- `impression` — 字符串或 null
- `contactFreq` — `"每周" | "每两周" | "每月" | "每季度" | null`
- `tagIds` — 字符串数组，替换全部标签关联（set 操作）

**逻辑：**
- 所有字段可选，只更新传入的字段
- `tagIds` 若传入：校验每个 tag 属于当前用户，然后用 `set` 替换（全量覆盖，不做增量 diff）
- 权限同 GET /:id — `where: { id, userId }` 查不到返回 `403`
- 返回更新后完整联系人（含 tags）

**Request body 示例：**
```json
{ "name": "阿伟", "tagIds": ["tag_id_1", "tag_id_2"] }
```

**Response 200:** 更新后联系人对象（含 tags）

---

## DELETE /api/contacts/:id — 软删除

**逻辑：**
- 权限同 GET /:id — `where: { id, userId }` 查不到返回 `403`
- `prisma.contact.update({ data: { deletedAt: new Date() } })`
- 返回 `204`，空 body

---

## 权限模型

所有 `[id]` 路由统一：
```
先查 prisma.contact.findFirst({ where: { id, userId: session.user.id } })
结果为 null → 返回 403（不区分"不存在"和"他人的"）
```

软删除的联系人在 `GET /api/contacts` 中自动过滤；`GET/PATCH/DELETE /:id` 对已软删除的联系人返回 `403`（查询时加 `deletedAt: null` 条件）。

---

## 错误格式

统一：`{ "error": "..." }`

| 状态码 | 场景 |
|--------|------|
| 401 | 未登录 |
| 403 | 联系人不存在或不属于当前用户 |
| 400 | 校验失败（name 为空、tagIds 包含他人标签） |
| 204 | 软删除成功（无 body） |

---

## 不在范围内

- 重要日期 CRUD — KNW-007
- 互动记录 CRUD — KNW-009
- 前端联系人列表页 — KNW-004
- 前端档案页 — KNW-005
