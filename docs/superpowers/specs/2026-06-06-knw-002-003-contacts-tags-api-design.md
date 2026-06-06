# KNW-002 + KNW-003 — 创建联系人 API + 标签系统 API 设计

**日期：** 2026-06-06
**负责人：** Sarah
**依赖：** KNW-000（认证已完成）、Prisma Schema（已完成）

---

## 范围

本设计覆盖两个 ticket：

- **KNW-003** 标签 API：`GET/POST /api/tags`、`DELETE /api/tags/:id`
- **KNW-002** 创建联系人 API：`POST /api/contacts`

KNW-003 先实现，因为 KNW-002 依赖标签 upsert 逻辑。

---

## 文件结构

```
app/api/
  contacts/
    route.ts          # POST /api/contacts
  tags/
    route.ts          # GET /api/tags, POST /api/tags
    [id]/
      route.ts        # DELETE /api/tags/:id
```

所有路由复用已有的 `lib/db.ts` (`prisma`) 和 `auth.ts` (`auth()`)。

---

## KNW-003 — 标签 API

### GET /api/tags

返回当前用户所有标签，预设标签（isPreset=true）排在前面，按 name 升序。

**Response 200:**
```json
[
  { "id": "...", "name": "朋友", "isPreset": true },
  { "id": "...", "name": "读书会", "isPreset": true },
  { "id": "...", "name": "瑜伽班", "isPreset": false }
]
```

### POST /api/tags

创建自定义标签。

**Request body:**
```json
{ "name": "瑜伽班" }
```

**Responses:**
- `201` — 创建成功，返回新标签对象
- `400` — name 为空
- `409` — 该用户下同名标签已存在（利用 `@@unique([userId, name])` 约束）

### DELETE /api/tags/:id

删除自定义标签，解除与所有联系人的关联（Prisma 隐式多对多自动处理），不删除联系人本身。

**Responses:**
- `204` — 删除成功
- `403` — 试图删除预设标签（isPreset=true）
- `404` — 标签不存在或不属于当前用户

---

## KNW-002 — 创建联系人 API

### POST /api/contacts

**Request body（zod schema）:**
```json
{
  "name": "阿伟",           // required, non-empty string
  "metAt": "读书会",        // optional string
  "impression": "喜欢骑行", // optional string
  "tagIds": ["tag_id_1"],  // optional, existing tag IDs
  "newTags": ["社群"]       // optional, tag names to upsert
}
```

**逻辑：**
1. 从 `auth()` 取 session，未登录返回 401
2. zod 校验 body，name 为空返回 400
3. 校验 `tagIds` 中每个 tag 的 `userId === session.user.id`，防止关联他人标签，违规返回 400
4. `newTags` 中的标签名逐一 `upsert`（`where: { userId_name }`, `create: { userId, name, isPreset: false }`）
5. 合并 `tagIds` 和 upserted tag IDs，`prisma.contact.create` 时用 `connect`
6. 返回完整联系人对象（含 `tags`）

**Response 201:**
```json
{
  "id": "c_abc123",
  "name": "阿伟",
  "metAt": "读书会",
  "impression": "喜欢骑行",
  "tags": [{ "id": "...", "name": "社群", "isPreset": false }],
  "createdAt": "2026-06-06T..."
}
```

**Responses:**
- `201` — 创建成功
- `400` — name 为空 / tagIds 包含他人标签
- `401` — 未登录

---

## 认证模式

所有路由：

```ts
const session = await auth()
if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
const userId = session.user.id
```

---

## 错误格式

统一：
```json
{ "error": "描述" }
```

---

## 不在范围内

- `GET /api/contacts`、`PATCH`、`DELETE` — 属于 KNW-006
- `GET /api/contacts/:id` — 属于 KNW-006
- 标签在前端的 UI 组件 — 属于 KNW-001、KNW-003 前端部分
