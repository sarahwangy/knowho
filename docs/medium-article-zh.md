# 我用 7 天独立开发了一款私人关系管理器 —— 从零到完整产品的全过程

> 副标题：Next.js 16 + AI + 语音 + 头像，一个帮你维护人际关系的 Web App

---

人们常说：人生中真正重要的，不是你做了多少事，而是你在乎了多少人。

但我们大多数人的通讯录里，有几百个联系人，却不记得上次和某个老朋友说话是什么时候。LinkedIn 告诉你谁升职了，微信告诉你谁发了动态，但没有任何工具会提醒你：**你已经三个月没联系张三了，而他的生日下周就到了。**

这就是 **Knowho** 诞生的原因 —— 一个专属于你的私人关系管理器。

---

## 它是什么

Knowho 不是 CRM，不是通讯录，也不是社交网络。它是一个帮你记住「重要的人」的工具：

- 你认识了谁，在哪儿认识的，第一印象是什么
- 他们的生日、纪念日等重要日期
- 每次联系后你记录的印象和动态
- AI 助手帮你回忆：「我上次见王芳是什么时候？她好像有个孩子？」

---

## 技术栈选择：为什么这样选

在开始之前，我花了不到一天时间定下技术方向：

| 选择 | 理由 |
|------|------|
| **Next.js App Router** | API + 前端一体，部署简单，适合单人项目 |
| **Prisma 7 + PostgreSQL** | 类型安全 ORM，关系数据天然适合联系人场景 |
| **NextAuth v5** | 5 分钟接入 Google 登录，JWT 策略兼容 Edge Middleware |
| **Tailwind CSS v4** | 设计系统级 token，不用维护 CSS 文件 |
| **Claude Haiku** | 速度快、成本低，适合对话式助手场景 |
| **OpenAI Whisper** | 语音转文字准确率高，尤其中文表现好 |

---

## 开发旅程：按时间顺序

### Day 1（5月31日）：打地基

第一天的任务是把所有基础设施搭稳。Prisma 数据库模型是整个产品的骨架：

```prisma
model Contact {
  id          String   @id @default(cuid())
  userId      String
  name        String
  metAt       String?      // 在哪里认识的
  impression  String?      // 第一印象
  avatar      String?      // emoji 或 base64 图片
  contactFreq String?      // 联系频率
  tags        Tag[]
  importantDates ImportantDate[]
  interactions   Interaction[]
}
```

设计上我做了一个关键决策：**软删除**。联系人不会真正消失，只是打上 `deletedAt` 标记。这避免了误删带来的数据损失。

NextAuth v5 配置也踩了一个坑：Edge Middleware 不支持 Node.js runtime，而 Prisma 用了 `node:util/types`。解决方案是把 auth 配置拆成两个文件，Middleware 用纯 JWT 验证，不碰数据库。

```ts
// auth.config.ts — Edge 安全，纯 JWT
export const authConfig = {
  session: { strategy: "jwt" },
  // ...
}

// auth.ts — 完整配置，含 Prisma adapter
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
})
```

### Day 3（6月2日）：认证与路由保护

登录页用了一个简洁的设计：只有一个 Google 登录按钮，配上品牌名的打字动画效果。路由保护用 Next.js Middleware 实现，所有 `/dashboard`、`/people`、`/calendar` 等页面，未登录一律跳回登录页。

### Day 8（6月6日）：核心 CRUD API

这一天是工作量最大的一天：

1. **联系人 API** —— GET（带搜索/标签过滤）、POST、PATCH、软删除 DELETE
2. **标签 API** —— 自定义标签的完整 CRUD
3. **重要日期 API** —— 生日、纪念日的添加和删除
4. **互动记录 API** —— 每次联系的记录和查看

所有 API 都用 Zod 做请求体验证，任何格式错误立刻返回 400，不会让脏数据进数据库：

```ts
const patchContactSchema = z.object({
  name: z.string().min(1).optional(),
  metAt: z.string().nullable().optional(),
  impression: z.string().nullable().optional(),
  contactFreq: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
  avatar: z.string().nullable().optional(),
})
```

这一天还完成了新建联系人的表单页，用 `react-hook-form` 管理表单状态，TagPicker 组件支持多选标签并可实时创建新标签。

### Day 9（6月7日）：产品功能爆发

这一天是整个开发旅程中密度最高的一天，从早到晚连续交付了 8 个功能模块。

#### 仪表盘：你的关系健康状态

首页仪表盘展示四个核心数据：
- 总联系人数
- 本月互动次数  
- 近期重要日期（未来 30 天内）
- 久未联系的人（超过 90 天没互动）

久未联系列表是我最喜欢的功能 —— 它用 Prisma 聚合查询找出互动记录中距今最久的联系人，用红色数字强调天数，像一个温柔的提醒。

#### 天气小组件：一个小细节改变整体气质

仪表盘右上角有一个实时天气显示。实现逻辑：

1. 浏览器 Geolocation API 获取经纬度
2. 前端请求 `/api/weather?lat=...&lon=...`
3. 服务端持有 API Key，代理请求 OpenWeatherMap

这里有一个安全细节值得注意：**不要把 API Key 拼接到模板字符串里**，因为模板字符串会出现在日志里：

```ts
// ❌ 危险：Key 可能出现在日志
const url = `https://api.openweathermap.org/...&appid=${apiKey}`

// ✅ 安全：用 URL 对象设置参数
const url = new URL("https://api.openweathermap.org/data/2.5/weather")
url.searchParams.set("appid", apiKey)
```

天气 emoji 根据图标代码映射，并加上 CSS 动画：晴天 ☀️ 做 pulse 脉冲，雨天 🌧️ 做 drip 下落，雾天 🌫️ 做 float 漂浮。

#### 语音输入：让记录变得轻松

语音录入用 MediaRecorder API 录音，发送到 OpenAI Whisper 转写：

```ts
// 开始录音
const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
const recorder = new MediaRecorder(stream, {
  mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4"
})

// 收集音频块
recorder.ondataavailable = (e) => chunks.push(e.data)

// 停止后发送 Whisper
recorder.onstop = async () => {
  const blob = new Blob(chunks, { type: mimeType })
  const formData = new FormData()
  formData.append("audio", blob, "recording." + ext)
  // POST /api/voice/transcribe
}
```

录音时有 5 根声波柱子做动画，用纯 CSS @keyframes 实现，每根柱子有不同的 animationDelay，产生真实的声波效果。

#### AI 助手：4 个人格，任你选择

AI 助手接入了 Claude Haiku，支持两种模式：
- **chat 模式**：基于你的联系人数据自由对话
- **record 模式**：从语音/文字中解析结构化联系人信息

最有趣的设计是 4 个 AI 人格，每个人格通过 `characterTone` 参数影响系统提示词：

| 人格 | 风格 |
|------|------|
| 🌿 Knowho | 中立的关系助手 |
| 🦉 苏苏 | 睿智，善于多角度分析 |
| ☀️ 小暖 | 温暖，善于鼓励 |
| 🎯 明哥 | 直接，简洁，不废话 |

语音回复用的是浏览器内置 `window.speechSynthesis`，完全免费，不需要任何 API Key。小暖的音调设为 1.2（偏高），明哥设为 0.9（偏低），一行代码就能体现人格差异。

#### 头像系统：让联系人有了面孔

头像存储方案选了最简单的方式：**nullable string 字段**。

- `null` → 显示姓名首字母
- `"🦊"` 等 emoji → 直接渲染 emoji
- `"data:image/..."` → base64 图片，用 `<img>` 标签显示

照片上传用 FileReader API 转成 base64：

```ts
const reader = new FileReader()
reader.onload = (ev) => {
  if (typeof ev.target?.result === "string") onChange(ev.target.result)
}
reader.readAsDataURL(file)
```

这个方案的好处：不需要对象存储，不需要 CDN，不需要额外的服务 —— 对于个人使用的 app，完全够用。

---

## 最难搞的三个技术问题

### 1. Edge Runtime 与 Node.js 的边界

Next.js Middleware 运行在 Edge Runtime，它不支持 Node.js 特有的模块（如 `node:util/types`，而 Prisma 内部用了这个）。解决方案是严格区分：Middleware 只用 JWT，绝对不触碰数据库。

### 2. 数据库聚合查询的性能

仪表盘需要在一个请求里完成 5 个不同的数据库查询（统计数、近期日期、久未联系等）。用 `Promise.all` 并行执行所有查询，把响应时间从 ~600ms 降到 ~200ms。

### 3. 语音录音的格式兼容性

Safari 不支持 `audio/webm`，只支持 `audio/mp4`。每次录音前需要检测支持情况：

```ts
const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4"
const ext = mimeType === "audio/webm" ? "webm" : "mp4"
```

---

## 设计哲学：克制胜于堆砌

整个开发过程中，我坚持了几个原则：

**1. 只做有用的，不做有趣的。** 没有社交分享，没有协作功能，没有公开主页。Knowho 是私人的，就应该保持私人。

**2. 零配置使用。** 用 Google 账号登录，立刻可以开始添加联系人。没有引导流程，没有必填教程。

**3. 失败静默，不打扰用户。** 天气获取失败就不显示，语音转写失败就保留用户原始输入。用户的主流程不应该被辅助功能的失败中断。

**4. 每个功能都有最低成本实现。** 语音回复用浏览器 TTS 而不是 OpenAI TTS，头像存 base64 而不是 S3，避免不必要的外部依赖和成本。

---

## 下一步

Knowho 目前是纯本地部署的个人工具。接下来计划：

- [ ] 部署到 Vercel，支持多设备访问
- [ ] 联系人图谱视图（谁介绍你认识谁）
- [ ] 定期邮件提醒（「你已经 30 天没联系李明了」）
- [ ] 导入通讯录（手动 CSV 上传）

---

## 写在最后

独立开发一个产品，最难的不是技术，而是**保持克制**。每次想加功能的时候，都要问自己：这真的是用户（我自己）需要的吗？

Knowho 解决的是一个真实的问题 —— 我们都有那些「消失」在通讯录里的重要的人。一个工具不能帮你维系感情，但它可以帮你记住，提醒你，然后行动的是你。

如果你也有类似的想法，欢迎交流。代码会在整理后开源。

---

*用到的工具：Next.js · Prisma · PostgreSQL · NextAuth · Tailwind CSS · Claude API · Whisper API · OpenWeatherMap*
