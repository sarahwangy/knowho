# KNW-007 + KNW-009 — 重要日期 & 互动记录 API 设计

**日期：** 2026-06-06
**负责人：** Sarah
**依赖：** KNW-006（联系人 CRUD 已完成）、Prisma Schema（已完成）

---

## 范围

- **KNW-007：** `POST /api/contacts/:id/dates`、`DELETE /api/contacts/:id/dates/:dateId`
- **KNW-009：** `GET /api/contacts/:id/interactions`、`POST /api/contacts/:id/interactions`、`DELETE /api/interactions/:id`

---

## 文件结构

```
app/api/
  contacts/[id]/
    dates/
      route.ts              # POST /api/contacts/:id/dates
      [dateId]/
        route.ts            # DELETE /api/contacts/:id/dates/:dateId
    interactions/
      route.ts              # GET + POST /api/contacts/:id/interactions
  interactions/
    [id]/
      route.ts              # DELETE /api/interactions/:id
```

---

## KNW-007 — 重要日期

### POST /api/contacts/:id/dates

**Request body（zod schema）：**
```json
{
  "type": "生日",          // required: "生日" | "纪念日" | "自定义"
  "label": "结婚纪念日",   // required if type === "自定义"，otherwise optional
  "month": 8,              // required: 1-12
  "day": 15,               // required: 1-31
  "year": 1990,            // optional
  "remindDaysBefore": 3    // optional, default 3, must be 1 | 3 | 7
}
```

**逻辑：**
1. `auth()` 取 session，未登录 401
2. `getOwnedContact(contactId, userId)` 验证联系人归属，失败 403
3. zod 校验 body，失败 400
4. `type === "自定义"` 且 `label` 为空 → 400 `{ "error": "label is required for custom type" }`
5. `prisma.importantDate.create`，返回 201 含新建对象

**Response 201：**
```json
{
  "id": "...",
  "contactId": "...",
  "type": "生日",
  "label": null,
  "month": 8,
  "day": 15,
  "year": 1990,
  "remindDaysBefore": 3
}
```

### DELETE /api/contacts/:id/dates/:dateId

**逻辑：**
1. `auth()` + `getOwnedContact(contactId, userId)`，失败 403
2. `prisma.importantDate.findFirst({ where: { id: dateId, contactId } })` 验证归属，失败 403
3. 物理删除，返回 204

---

## KNW-009 — 互动记录

### GET /api/contacts/:id/interactions

**逻辑：**
1. `auth()` + `getOwnedContact(contactId, userId)`，失败 401/403
2. `prisma.interaction.findMany({ where: { contactId }, orderBy: [{ date: "desc" }, { createdAt: "desc" }] })`
3. 返回 200 数组

### POST /api/contacts/:id/interactions

**Request body：**
```json
{
  "content": "她说女儿考上大学了",  // required, non-empty
  "date": "2026-05-31"              // required, ISO date string (YYYY-MM-DD)
}
```

**逻辑：**
1. `auth()` + `getOwnedContact(contactId, userId)`，失败 401/403
2. zod 校验，`content` 为空 → 400，`date` 格式无效 → 400
3. `date` 字符串转为 `new Date(date)`（UTC 午夜）存入 DateTime 字段
4. 返回 201 含新建记录

**Response 201：**
```json
{
  "id": "...",
  "contactId": "...",
  "content": "她说女儿考上大学了",
  "date": "2026-05-31T00:00:00.000Z",
  "createdAt": "..."
}
```

### DELETE /api/interactions/:id

**逻辑：**
1. `auth()` 取 session，未登录 401
2. `prisma.interaction.findFirst({ where: { id }, include: { contact: { select: { userId: true } } } })`
3. 不存在或 `contact.userId !== session.user.id` → 403
4. 物理删除，返回 204

---

## 权限模式

```ts
// 所有联系人子资源路由复用此辅助函数（已在 app/api/contacts/[id]/route.ts 定义）
async function getOwnedContact(id: string, userId: string) {
  return prisma.contact.findFirst({ where: { id, userId, deletedAt: null } })
}
```

`DELETE /api/interactions/:id` 独立验证：通过 join `contact` 取 `userId` 比对，不依赖联系人路由。

---

## 错误格式

统一：`{ "error": "..." }`

| 状态码 | 场景 |
|--------|------|
| 401 | 未登录 |
| 403 | 资源不存在或不属于当前用户 |
| 400 | 校验失败 |
| 201 | 创建成功 |
| 204 | 删除成功（无 body） |

---

## 不在范围内

- 重要日期提醒推送 — KNW-016（P2）
- 互动记录前端 UI — KNW-008
- AI 结构化互动记录 — KNW-014（P2）
