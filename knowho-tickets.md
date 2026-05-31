# Knowho — Ticket 列表

> 项目：Knowho · 负责人：Sarah · 版本：v0.2 · 2026-05-31
> 技术栈：Next.js (App Router) + TypeScript · Prisma + Vercel Postgres · Vercel 部署 · NextAuth.js (Google OAuth)
> 状态标记：`[ ]` 待开始 · `[~]` 进行中 · `[x]` 已完成 · `[!]` 阻塞中

---

## 概览

| Ticket | 标题 | Epic | 优先级 | 状态 | 估时 |
|--------|------|------|--------|------|------|
| KNW-000 | 用户认证（Google OAuth + Session） | EPIC-00 认证 | 🟠 P0 | [ ] | 1天 |
| KNW-001 | 添加联系人表单 UI | EPIC-01 快速添加人 | 🟠 P0 | [ ] | 1.5天 |
| KNW-002 | 数据库 Schema + API：创建联系人 | EPIC-01 快速添加人 | 🟠 P0 | [ ] | 1.5天 |
| KNW-003 | 标签系统：预设 + 自定义 | EPIC-01 快速添加人 | 🟠 P0 | [ ] | 2天 |
| KNW-004 | 联系人列表页 UI | EPIC-02 个人档案页 | 🟠 P0 | [ ] | 1.5天 |
| KNW-005 | 联系人档案页 UI | EPIC-02 个人档案页 | 🟠 P0 | [ ] | 2天 |
| KNW-006 | 后端 API：查询 / 更新 / 删除联系人 | EPIC-02 个人档案页 | 🟠 P0 | [ ] | 1天 |
| KNW-007 | 重要日期字段与录入 | EPIC-03 生日提醒 | 🟠 P0 | [ ] | 1.5天 |
| KNW-008 | 添加互动记录 UI | EPIC-04 互动时间线 | 🟠 P0 | [ ] | 2天 |
| KNW-009 | 后端 API：互动记录 CRUD | EPIC-04 互动时间线 | 🟠 P0 | [ ] | 1天 |
| KNW-010 | 见面前提示卡 | EPIC-05 提示卡 | 🟡 P1 | [ ] | 1.5天 |
| KNW-011 | 语音备注录入组件 | EPIC-06 语音备注 | 🟡 P1 | [ ] | 4天 |
| KNW-012 | 好友共享链接 | EPIC-07 好友共享 | 🟡 P1 | [ ] | 2天 |
| KNW-013 | UI 文案审查与替换 | EPIC-08 社区语言 | 🟡 P1 | [ ] | 1天 |
| KNW-014 | AI 结构化互动记录 | EPIC-09 AI整理 | 🔵 P2 | [ ] | 4天 |
| KNW-015 | "快冷掉"提醒 | EPIC-09 AI整理 | 🔵 P2 | [ ] | 2天 |
| KNW-016 | 提醒推送服务（定时任务 + Resend 邮件） | EPIC-03 生日提醒 | 🔵 P2 | [ ] | 2.5天 |

**P0 合计：** ≈ 14天 · **P1 合计：** 8.5天 · **P2 合计：** 8.5天

> ⚠️ KNW-016（邮件推送）从原 P0 KNW-007 拆出，推迟至 P2，等 Resend 接入后实施。
> ⚠️ KNW-015 依赖 KNW-016，两者同属 P2，不可提前。

---

## 🟠 P0 — 核心层

---

### KNW-000 · 用户认证（Google OAuth + Session）

**Epic：** EPIC-00 认证基础
**优先级：** P0
**估时：** 1天
**依赖：** 无（最先做）
**状态：** `[ ]` 待开始

#### 需求描述

使用 NextAuth.js 接入 Google OAuth，是所有功能的前置依赖。未登录用户重定向到登录页，所有 API 路由校验 session。

#### 技术方案

```
NextAuth.js v5 (Auth.js)
Provider: Google OAuth 2.0
Session 策略: JWT（无需额外数据库表）
保护路由: Next.js middleware
```

#### 验收标准

- [ ] 访问任何页面未登录时自动跳转登录页
- [ ] 点击"用 Google 登录"完成 OAuth 授权后跳转首页
- [ ] 登录后 session 中可取到 `user.id`（email hash 或 Google sub）
- [ ] 退出登录后 session 清除，再次重定向登录页
- [ ] 所有 `/api/*` 路由未登录返回 `401`

---

### KNW-001 · 添加联系人表单 UI

**Epic：** EPIC-01 快速添加人
**优先级：** P0
**估时：** 1.5天
**依赖：** KNW-000（认证）、KNW-002（API）、KNW-003（标签）
**状态：** `[ ]` 待开始

#### 需求描述

实现"添加联系人"表单页，直接使用 shadcn/ui 组件，无需单独出设计稿。字段如下：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 姓名 | 文本 | ✅ | 自动聚焦，打开即可输入 |
| 认识场合 | 文本 | ❌ | placeholder："在哪儿认识的？" |
| 一句话印象 | 文本 | ❌ | placeholder："让你记住 Ta 的那件事" |
| 标签 | 多选 | ❌ | 来自 KNW-003，可新建 |
| 语音备注入口 | 图标按钮 | ❌ | P1 实现，P0 占位即可 |

#### 验收标准

- [ ] 页面打开后姓名输入框自动聚焦
- [ ] 从打开到提交全程 ≤ 30秒（实测）
- [ ] 移动端（375px 宽）一屏内完成，无需滚动
- [ ] 姓名为唯一必填项，其余跳过不报错
- [ ] 提交成功后跳转到该联系人档案页（KNW-005）
- [ ] 提交失败时显示友好提示，不丢失已填内容

#### 技术备注

- 表单状态用 `react-hook-form` + `zod` 校验
- 标签组件独立封装，供档案编辑页复用
- UI 组件：shadcn/ui（Input、Button、Badge、Command）

---

### KNW-002 · 数据库 Schema + API：创建联系人

**Epic：** EPIC-01 快速添加人
**优先级：** P0
**估时：** 1.5天（Schema 设计 0.5天 + API 1天）
**依赖：** KNW-000（认证）
**状态：** `[ ]` 待开始

#### 需求描述

统一设计全项目 Prisma Schema，并实现创建联系人 API。Schema 是整个项目的数据基础，必须在此 ticket 完成后其他 ticket 才可并行推进。

#### Prisma Schema（全量）

```prisma
model User {
  id           String    @id @default(cuid())
  email        String    @unique
  name         String?
  image        String?
  contacts     Contact[]
  tags         Tag[]
  createdAt    DateTime  @default(now())
}

model Contact {
  id             String           @id @default(cuid())
  userId         String
  user           User             @relation(fields: [userId], references: [id])
  name           String
  metAt          String?
  impression     String?
  tags           Tag[]
  importantDates ImportantDate[]
  interactions   Interaction[]
  shareTokens    ShareToken[]
  contactFreq    String?          // P2: '每周'|'每两周'|'每月'|'每季度'|null
  createdAt      DateTime         @default(now())
  deletedAt      DateTime?
}

model Tag {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  name      String
  isPreset  Boolean   @default(false)
  contacts  Contact[]

  @@unique([userId, name])
}

model ImportantDate {
  id               String   @id @default(cuid())
  contactId        String
  contact          Contact  @relation(fields: [contactId], references: [id])
  type             String   // '生日' | '纪念日' | '自定义'
  label            String?  // 自定义类型名称
  month            Int      // 1-12，生日仅存月日
  day              Int      // 1-31
  year             Int?     // 可选，不填则每年提醒
  remindDaysBefore Int      @default(3)
}

model Interaction {
  id          String   @id @default(cuid())
  contactId   String
  contact     Contact  @relation(fields: [contactId], references: [id])
  content     String
  date        DateTime
  createdAt   DateTime @default(now())
}

model ShareToken {
  id        String   @id @default(cuid())
  contactId String
  contact   Contact  @relation(fields: [contactId], references: [id])
  token     String   @unique @default(cuid())
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime @default(now())
}
```

> **说明：** ImportantDate 将 `date DATE` 拆分为 `month` + `day` + `year?`，解决"年份可选"与 SQL DATE 类型的冲突。

#### API 接口

```
POST /api/contacts
Authorization: session cookie

Request Body:
{
  "name": "阿伟",
  "metAt": "读书会",
  "impression": "他喜欢骑行",
  "tagIds": ["tag_id_1"],
  "newTags": ["社群"]
}

Response 201:
{
  "id": "c_abc123",
  "name": "阿伟",
  ...
}
```

#### 验收标准

- [ ] Prisma Schema 包含全部 6 个 model，`prisma migrate dev` 无报错
- [ ] `name` 为空时返回 `400 { "error": "name is required" }`
- [ ] 成功创建返回 `201` 含完整联系人对象（含标签）
- [ ] `newTags` 中的标签自动创建并关联
- [ ] 联系人与当前登录用户绑定，`userId` 取自 session

---

### KNW-003 · 标签系统：预设 + 自定义

**Epic：** EPIC-01 快速添加人
**优先级：** P0
**估时：** 2天（后端 1天 + 前端组件 1天）
**依赖：** KNW-002（Schema）
**状态：** `[ ]` 待开始

#### 需求描述

标签是核心分组工具。首次用户注册后自动种入预设标签。

**预设标签（seed 脚本写入）**

`读书会` `健身群` `邻居` `工作` `社群` `家人` `朋友` `其他`

#### API 接口

```
GET    /api/tags              获取当前用户所有标签（含预设）
POST   /api/tags              新建自定义标签 { "name": "瑜伽班" }
DELETE /api/tags/:id          删除自定义标签（预设 isPreset=true 不可删）
```

#### 验收标准

- [ ] 新用户首次登录后预设标签自动可用（seed on first login）
- [ ] 用户可在表单内直接输入新标签名并创建
- [ ] 标签名重复时返回 `409`
- [ ] 删除标签仅解除关联，不删除联系人
- [ ] 预设标签删除请求返回 `403`

---

### KNW-004 · 联系人列表页 UI

**Epic：** EPIC-02 个人档案页
**优先级：** P0
**估时：** 1.5天
**依赖：** KNW-002、KNW-003、KNW-006
**状态：** `[ ]` 待开始

#### 需求描述

用户打开 app 的第一屏，展示所有联系人，支持搜索和标签筛选。这是 KNW-005（原版）中遗漏的前端页面。

**页面结构**

```
┌─────────────────────────────┐
│  🔍 搜索认识的人              │
├─────────────────────────────┤
│  [全部] [读书会] [健身群] ...  │  ← 标签筛选 chips
├─────────────────────────────┤
│  阿伟  · 读书会 · 3天前联系   │
│  小林  · 邻居   · 2周前联系   │
│  ...                        │
├─────────────────────────────┤
│         [+ 认识新朋友了？]     │  ← FAB 按钮
└─────────────────────────────┘
```

#### 验收标准

- [ ] 展示当前用户所有未删除联系人
- [ ] 搜索框实时过滤（姓名模糊匹配，前端过滤即可）
- [ ] 标签筛选 chip 点击切换，支持多选
- [ ] 右下角 FAB 按钮跳转添加联系人表单（KNW-001）
- [ ] 空状态显示：「还没有认识新朋友？出门走走吧 :)」
- [ ] 移动端（375px）布局正常

---

### KNW-005 · 联系人档案页 UI

**Epic：** EPIC-02 个人档案页
**优先级：** P0
**估时：** 2天
**依赖：** KNW-006（API）、KNW-009（互动记录API）
**状态：** `[ ]` 待开始

#### 需求描述

展示单个联系人的完整信息，是用户"见面前翻开复习"的核心页面。

**页面结构（从上到下）**

```
┌─────────────────────────────┐
│  [见面前提示卡]  ← P1占位    │
├─────────────────────────────┤
│  头像 · 姓名 · 标签          │
│  认识场合 · 一句话印象        │
├─────────────────────────────┤
│  重要日期列表                │
├─────────────────────────────┤
│  互动时间线（倒序）           │
│  └─ [+ 记一条]               │
└─────────────────────────────┘
```

#### 验收标准

- [ ] 所有字段正确展示，空字段不显示（不占位）
- [ ] 时间线按日期倒序排列
- [ ] 右上角有"编辑"入口，跳转编辑页
- [ ] 见面前提示卡区域 P0 显示占位块（灰色背景），P1 实现内容
- [ ] 移动端（375px）布局正常，无横向溢出

---

### KNW-006 · 后端 API：查询 / 更新 / 删除联系人

**Epic：** EPIC-02 个人档案页
**优先级：** P0
**估时：** 1天
**依赖：** KNW-002
**状态：** `[ ]` 待开始

#### API 接口

```
GET    /api/contacts          列表（支持 ?tagId=&search=）
GET    /api/contacts/:id      单个，含标签 + 重要日期 + 互动时间线
PATCH  /api/contacts/:id      部分更新
DELETE /api/contacts/:id      软删除（设置 deletedAt）
```

#### 验收标准

- [ ] `GET /api/contacts` 支持 `tagId` 筛选和 `search`（姓名模糊匹配）
- [ ] `GET /api/contacts/:id` 返回完整嵌套数据（tags、importantDates、interactions）
- [ ] `PATCH` 仅更新传入字段，未传字段保持不变
- [ ] `DELETE` 软删除（设置 `deletedAt`），列表默认过滤已删除
- [ ] 访问他人联系人返回 `403`

---

### KNW-007 · 重要日期字段与录入

**Epic：** EPIC-03 生日 / 重要日期提醒
**优先级：** P0
**估时：** 1.5天（后端 0.5天 + 前端 1天）
**依赖：** KNW-006
**状态：** `[ ]` 待开始

#### 需求描述

在联系人档案中支持添加多个重要日期，为后续提醒功能（KNW-016，P2）打好数据基础。

**日期类型：** `生日` · `纪念日` · `自定义`

> **说明：** 年份可选填。数据库存储 `month` + `day` + `year?`（非 DATE 类型），避免 SQL DATE 不支持无年份的问题。

#### API 接口

```
POST   /api/contacts/:id/dates
       Body: { "type": "生日", "month": 8, "day": 15, "year": 1990, "remindDaysBefore": 3 }
DELETE /api/contacts/:id/dates/:dateId
```

#### 验收标准

- [ ] 日期录入 UI 在联系人档案页"重要日期"区块内
- [ ] 支持添加多个日期（无上限）
- [ ] 日期类型可选：生日 / 纪念日 / 自定义（后者需填类型名）
- [ ] 提前提醒天数可选：1天 / 3天 / 7天（默认3天）
- [ ] 年份为可选项（不填则每年重复提醒）
- [ ] 日期展示格式："8月15日" 或 "1990年8月15日"

---

### KNW-008 · 添加互动记录 UI

**Epic：** EPIC-04 互动时间线
**优先级：** P0
**估时：** 2天
**依赖：** KNW-009
**状态：** `[ ]` 待开始

#### 需求描述

在联系人档案页底部提供快速录入框，记录每次见面/通话。

**字段**

| 字段 | 默认值 | 说明 |
|------|--------|------|
| 日期 | 今天 | 可修改 |
| 内容 | 空 | 多行文本，无字数限制 |
| 语音入口 | — | P1 占位 |

#### 验收标准

- [ ] 录入框默认聚焦（不需额外点击）
- [ ] 日期默认今天，点击可修改
- [ ] 提交后时间线**无刷新**实时更新（乐观更新）
- [ ] 每条记录右侧有删除按钮，点击后确认删除
- [ ] 内容为空时提交按钮禁用

---

### KNW-009 · 后端 API：互动记录 CRUD

**Epic：** EPIC-04 互动时间线
**优先级：** P0
**估时：** 1天
**依赖：** KNW-006
**状态：** `[ ]` 待开始

#### API 接口

```
POST   /api/contacts/:id/interactions
       Body: { "content": "她说女儿考上大学了", "date": "2026-05-31" }
       Response 201: { "id": "...", "content": "...", "date": "...", "createdAt": "..." }

GET    /api/contacts/:id/interactions
       Response: [ { interaction }, ... ]  // 按 date 倒序，同日按 createdAt 倒序

DELETE /api/interactions/:id
       Response 204
```

#### 验收标准

- [ ] `content` 为空时返回 `400`
- [ ] 列表按 `date` 倒序，`date` 相同按 `createdAt` 倒序
- [ ] 只有所属用户可删除（他人操作返回 `403`）

---

---

## 🟡 P1 — 差异层

---

### KNW-010 · 见面前提示卡

**Epic：** EPIC-05 见面前提示卡
**优先级：** P1
**估时：** 1.5天
**依赖：** KNW-008、KNW-007
**状态：** `[ ]` 待开始

#### 需求描述

在联系人档案页顶部展示一张"提示卡"，帮助用户在见面前快速"唤醒记忆"。

**卡片内容逻辑**

```
有互动记录 → 显示最后一条摘要（前50字）
有近期日期（30天内）→ 显示"Ta 的生日在X天后"
两者都有 → 都显示
都没有 → 显示引导语
```

**展示示例**

```
┌─────────────────────────────────────┐
│ 📋 见面前看一眼                       │
│                                     │
│ 上次（5月20日）：她说女儿考上大学了，  │
│ 准备暑假去旅行。                      │
│                                     │
│ 🎂 她的生日在 12 天后（6月12日）       │
└─────────────────────────────────────┘
```

#### 验收标准

- [ ] 有互动记录时显示最后一条前50字（超出省略号）
- [ ] 有30天内重要日期时显示日期提示
- [ ] 无任何数据时显示：「还没有记录，见面后写点什么？」
- [ ] 卡片点击可展开查看完整最后一条互动
- [ ] 卡片样式温暖，区别于普通信息区

---

### KNW-011 · 语音备注录入组件

**Epic：** EPIC-06 语音备注
**优先级：** P1
**估时：** 4天
**依赖：** KNW-008
**状态：** `[ ]` 待开始

#### 需求描述

用户在活动现场或回家路上，边走边说，语音转文字自动填入录入框。

**技术方案**

```
优先：浏览器原生 Web Speech API（SpeechRecognition）
  → 零成本，无后端，延迟低
  → 支持：Chrome Android、Safari iOS 16+（需用户手势触发）

Fallback：OpenAI Whisper API（音频文件上传转录）
  → 用于不支持 Web Speech API 的环境
  → Next.js API Route 转发，避免暴露 API Key
```

> **风险说明：** iOS Safari 的 SpeechRecognition 在后台或息屏时会中断，属已知限制，降级提示覆盖此场景。估时从原 3 天调整为 4 天以覆盖兼容性测试。

#### 验收标准

- [ ] 麦克风按钮在互动录入框和新增联系人表单中均可见
- [ ] 按住麦克风按钮开始录音，松开自动停止并转文字
- [ ] 录音中有视觉反馈（脉冲动画）
- [ ] 转文字结果自动填入文本框，用户可在提交前编辑
- [ ] 未授权麦克风时显示引导提示（非报错）
- [ ] 不支持语音识别的环境显示友好降级提示
- [ ] 测试设备：Chrome Android、Safari iOS

---

### KNW-012 · 好友共享链接

**Epic：** EPIC-07 好友共享
**优先级：** P1
**估时：** 2天
**依赖：** KNW-006
**状态：** `[ ]` 待开始

#### 需求描述

生成一个只读链接，让用户把某人的名片分享给另一个朋友。

**共享内容（只读）**

✅ 包含：姓名、标签、认识场合、一句话印象
❌ 不包含：互动时间线、重要日期

#### API 接口

```
POST   /api/contacts/:id/share
       Response: { "shareUrl": "https://knowho.app/s/abc123", "expiresAt": "..." }

GET    /api/share/:token        公开，无需登录
       Response: { 联系人基础信息 }

DELETE /api/contacts/:id/share  撤销链接
```

#### 验收标准

- [ ] 链接有效期 7 天，过期返回 `410 Gone`
- [ ] 接收方无需注册即可查看基础卡片
- [ ] 用户可在档案页手动撤销链接（立即失效）
- [ ] 同一联系人同时只有一个有效链接（重新生成覆盖旧链接）
- [ ] 共享页不显示互动时间线和重要日期

---

### KNW-013 · UI 文案审查与替换

**Epic：** EPIC-08 社区语言风格
**优先级：** P1
**估时：** 1天
**依赖：** KNW-001、KNW-005（页面完成后执行）
**状态：** `[ ]` 待开始

#### 替换对照表

| 原文案 ❌ | 替换为 ✅ |
|----------|----------|
| 联系人 | 认识的人 |
| 创建记录 | 记下来 |
| 跟进 | 下次见面 |
| 添加联系人 | 认识新朋友了？ |
| 暂无数据 | 还没有记录，见面后写点什么？ |
| 删除成功 | 已移除 |
| 操作失败，请重试 | 好像出了点问题，再试一次？ |
| CRM | 永远不出现在用户界面 |

#### 验收标准

- [ ] 所有页面无销售/职场术语
- [ ] 空状态文案温暖、有引导性
- [ ] 错误提示人性化，非技术错误码
- [ ] 完成后输出"文案替换清单"截图存档

---

---

## 🔵 P2 — 进阶层

---

### KNW-014 · AI 结构化互动记录

**Epic：** EPIC-09 AI 功能
**优先级：** P2
**估时：** 4天
**依赖：** KNW-009、Claude API 接入
**状态：** `[ ]` 待开始

#### 需求描述

用户用口语写下一段描述，AI 自动提取结构化信息，以卡片方式提示用户确认，确认后才入库。

**示例**

```
用户输入：
"今天见了阿伟，他说他女儿刚考上大学，下个月去旅行庆祝，
顺便提了他下周要参加健身比赛"

AI 提取结果（以确认卡展示）：
┌──────────────────────────────────────┐
│ AI 帮你发现了这些，要保存吗？          │
│                                      │
│ 📅 下个月旅行 → 添加为重要日期？ [是][否] │
│ 🏅 下周健身比赛 → 添加为重要日期？ [是][否] │
│ 📝 女儿考上大学 → 已记入互动备注 ✓    │
└──────────────────────────────────────┘
```

#### 技术方案

```
调用 Claude API（claude-sonnet-4-6）
System prompt：从用户笔记中提取日期、事件、人物信息，返回 JSON
Response schema：
{
  "dates": [{ "label": "旅行", "approximateDate": "2026-06", "suggestReminder": true }],
  "events": [{ "description": "女儿考上大学" }],
  "summary": "阿伟女儿考上大学，下月旅行庆祝，下周参加健身比赛"
}
```

#### 验收标准

- [ ] AI 提取结果以确认卡展示，不自动写入
- [ ] 用户点"是"后对应数据入库，点"否"跳过
- [ ] 提取失败（API 超时等）时静默降级，正常保存原始文本
- [ ] API 调用有 loading 状态提示
- [ ] 单次调用 token 控制在 1000 以内

---

### KNW-015 · "快冷掉"提醒

**Epic：** EPIC-09 AI 功能
**优先级：** P2
**估时：** 2天
**依赖：** KNW-016（邮件服务必须先完成）、KNW-009
**状态：** `[ ]` 待开始

> ⚠️ 此 ticket 强依赖 KNW-016（提醒推送服务），不可在 KNW-016 完成前开始。

#### 需求描述

用户可为每个联系人设置"期望联系频率"，超过设定时间无互动记录时，系统自动推送提醒。

**频率选项：** 每周 · 每两周 · 每月 · 每季度 · 不提醒（默认）

#### 验收标准

- [ ] 频率设置入口在联系人档案页，默认"不提醒"
- [ ] 定时任务与 KNW-016 共用同一 Vercel Cron Job，合并为同一封邮件
- [ ] 超过频率天数 × 1.5 才触发（避免过度打扰）
- [ ] 可对单个联系人关闭此功能
- [ ] 有互动记录的联系人自动重置计时

---

### KNW-016 · 提醒推送服务（Vercel Cron + Resend 邮件）

**Epic：** EPIC-03 生日 / 重要日期提醒
**优先级：** P2
**估时：** 2.5天
**依赖：** KNW-007（重要日期数据）、Resend 账号配置
**状态：** `[ ]` 待开始

> ⚠️ 原 P0 KNW-007（邮件推送）拆出独立为此 ticket，推迟至 P2。
> 推迟原因：Resend 接入和 Vercel Cron 配置需要生产环境，MVP 阶段可通过手动查看档案代替。

#### 需求描述

每日定时扫描"今日需提醒"的日期记录，通过 Resend 发送提醒邮件。

#### 逻辑

```
Vercel Cron Job（每天 UTC+8 01:00，即 UTC 17:00）：
  查询所有 ImportantDate 中
    (month, day) = 今天月日 + remindDaysBefore 天
  → 按 userId 分组
  → 每个用户发一封汇总邮件（合并生日提醒 + 快冷掉提醒）
```

**邮件内容示例**

```
主题：🎂 阿伟的生日在 3 天后（8月18日）

Hi Sarah，

提醒你：你认识的人有近期重要日期——

· 阿伟 — 生日，8月18日（3天后）
· 小林 — 纪念日，8月20日（5天后）

在 Knowho 查看他们的档案 →

---
Knowho · 取消此提醒
```

#### 验收标准

- [ ] Vercel Cron Job 每天 UTC 17:00 触发（对应 UTC+8 01:00，避开用户睡眠时间）
- [ ] 同一天多个提醒合并为一封邮件
- [ ] 邮件包含联系人姓名、日期类型、距离天数
- [ ] 提供手动触发接口供测试：`POST /api/admin/trigger-reminders`（需 admin token）
- [ ] 用户可在设置中关闭邮件提醒
- [ ] 使用 Resend SDK，不使用 AWS SES

---

---

## 附：Ticket 汇总表（更新后）

| Ticket | 标题 | 优先级 | 估时 | 变更说明 |
|--------|------|--------|------|----------|
| KNW-000 | 用户认证（Google OAuth） | P0 | 1天 | **新增** |
| KNW-001 | 添加联系人表单 UI | P0 | 1.5天 | 估时从3天调整（无需设计稿） |
| KNW-002 | 数据库 Schema + 创建联系人 API | P0 | 1.5天 | 合并全量 Prisma Schema 设计 |
| KNW-003 | 标签系统 | P0 | 2天 | 无变化 |
| KNW-004 | 联系人列表页 UI | P0 | 1.5天 | **新增**（原文档遗漏） |
| KNW-005 | 联系人档案页 UI | P0 | 2天 | 原 KNW-004 |
| KNW-006 | API：查询/更新/删除联系人 | P0 | 1天 | 原 KNW-005 |
| KNW-007 | 重要日期字段与录入 | P0 | 1.5天 | 原 KNW-006，date 拆分为 month+day+year? |
| KNW-008 | 添加互动记录 UI | P0 | 2天 | 原 KNW-008 |
| KNW-009 | 互动记录 CRUD API | P0 | 1天 | 原 KNW-009 |
| KNW-010 | 见面前提示卡 | P1 | 1.5天 | 无变化 |
| KNW-011 | 语音备注录入组件 | P1 | 4天 | 估时从3天调整（iOS兼容测试） |
| KNW-012 | 好友共享链接 | P1 | 2天 | 无变化 |
| KNW-013 | UI 文案审查与替换 | P1 | 1天 | 无变化 |
| KNW-014 | AI 结构化互动记录 | P2 | 4天 | 模型更新为 claude-sonnet-4-6 |
| KNW-015 | "快冷掉"提醒 | P2 | 2天 | 依赖明确标注需 KNW-016 |
| KNW-016 | 提醒推送服务（Vercel Cron + Resend） | P2 | 2.5天 | **新增**（原 P0 KNW-007 拆出推迟） |

**P0 合计：** ≈ 14天（约 3 周）
**P1 合计：** 8.5天（约 2 周）
**P2 合计：** 8.5天（约 2 周）

---

*Knowho Tickets v0.2 · Sarah · 2026-05-31*
*变更：技术栈切换为 Next.js + Prisma + Vercel；补充 KNW-000 认证、KNW-004 列表页；邮件推送推迟为 KNW-016 P2；修复日期 schema 问题；统一 API 路径。*
