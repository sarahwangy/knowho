# 我用 AI 做了一个私人 CRM，因为我总是忘记朋友在做什么

## Vibe Coding 实录：Claude Haiku + Whisper + Next.js，从"我需要这个东西"到真正把它做出来

---

有没有过这种体验：隔了几个月再见到一个朋友，对方问你"你上次说要换工作，后来怎么样了？"——然后你脑子一片空白，完全不记得上次见他们是什么时候，聊了什么，更别说他们最近在忙什么了。

我有。而且不止一次。

我不是不在乎这些人。恰恰相反，正是因为在乎，才觉得这种"失忆"特别尴尬。于是我去找了一些 CRM 工具。Notion 模板、HubSpot 个人版、甚至有人推荐我用 Airtable 手动维护一张表……

用了两周之后我放弃了。那些工具是给销售人员设计的，充满了"pipeline"、"deal stage"、"lead score"这些概念。我只是想记住我的朋友在做什么，我们上次聊了什么，下次见面我想问他/她哪些事情。

所以我决定自己做一个。

这就是 **Knowho** 的来历。

---

## Knowho 是什么

Knowho 是一个私人 AI CRM，专门用来管理你真正在意的人：朋友、同事、导师、前辈。你可以记录每次互动，用语音或文字留下笔记，设置生日提醒，打标签分类。

但它的核心功能只有一个：**见人之前，让 AI 帮你做准备。**

Claude Haiku 会读取你和这个人的所有互动历史，生成一张"会议准备卡"，告诉你：上次他们在忙什么、可以继续聊的话题、不要忘记问的事。像一个拥有完美记忆的私人助理，在你出门前帮你复盘。

GitHub：[https://github.com/sarahwangy/knowho](https://github.com/sarahwangy/knowho)（开发中）

### 数据管道

```
用户输入（文字 / 语音）
        │
        ▼
  Whisper API 转录（语音路径）
        │
        ▼
  Prisma ORM → Vercel Postgres
  ┌─────────────────────────────────┐
  │  Contact（联系人）              │
  │  Interaction（互动记录）        │
  │  ImportantDate（重要日期）      │
  │  Tag（标签）                    │
  └─────────────────────────────────┘
        │
        ▼
  Claude Haiku（读取 Interaction[]）
        │
        ▼
  会议准备卡（JSON 结构化输出）
        │
        ▼
  浏览器 speechSynthesis 语音朗读（可选）
        │
        ▼
  展示给用户
```

就是这条链路。简单，但每一个环节都有值得说的细节。

---

## 我为什么做这个

说实话，这个项目的动机非常自私。

我在做 AI 相关的工作，认识的人越来越多——技术圈的、创业圈的、学术圈的——但我发现我对这些人的了解越来越"浅"。每次见面都像是从零开始。上次他在做什么？他的项目进展怎么样了？她好像提到过在申请某个项目，结果怎么样了？

我试过在备忘录里写，但找不到。试过发完消息给自己，积累了一堆没看的消息。试过用 Notion，但维护成本太高，最后就荒废了。

我需要的不是一个笔记软件，也不是一个销售工具。我需要的是一个**会替我记住所有事的系统，并且在我需要的时候主动告诉我该知道什么**。

这正是大语言模型擅长做的事情：读取非结构化的历史记录，提炼出有用的信息，用对话的方式呈现给你。

加上我最近在练习 vibe coding——用 Claude Code 做 AI 辅助开发，不只是让它补全代码，而是让它参与整个产品思考过程——这个项目就成了一个非常自然的练手对象。

---

## 技术栈

| 类别 | 技术选型 | 备注 |
|------|----------|------|
| 前端框架 | Next.js 14 (App Router) | Server Components + Client Components 混用 |
| 样式 | Tailwind CSS + shadcn/ui | 快速原型，组件质量高 |
| 数据库 | Vercel Postgres (via Prisma) | 免费额度够用，ORM 类型安全 |
| 认证 | NextAuth v5 + Google OAuth | Edge Runtime 兼容 |
| AI 主力 | Claude Haiku (claude-haiku-4-5) | 速度快、成本低、理解中文出色 |
| 语音转录 | OpenAI Whisper API | 准确率高，支持多语言 |
| 数据验证 | Zod | 所有 API 路由入口验证 |
| 天气小组件 | OpenWeatherMap API | 仪表盘装饰性功能 |
| 语音回复 | 浏览器 speechSynthesis | 免费，不需要额外 API key |
| 部署 | Vercel | 开发中，尚未完全部署 |

---

## API 使用详解

### Claude Haiku — 会议准备卡生成

我选 Haiku 而不是 Sonnet，主要是速度和成本的考虑。会议准备卡需要在用户点击"准备见面"按钮后快速生成，延迟超过 3 秒就会破坏体验。Haiku 在这个场景下通常能在 1-2 秒内响应，而成本也比 Sonnet 低一个数量级。

模型名称：`claude-haiku-4-5`（当前使用版本）

具体做法是把联系人的所有互动记录拼成一个长文本，塞进 user message，然后用一个精心设计的 system prompt 引导它输出结构化 JSON。

输出格式是我硬编码在 prompt 里的——我不依赖 tool use / structured output，而是直接在 prompt 里写明"你必须返回以下 JSON 格式"，然后用正则从返回文本里提取 JSON。有点 hacky，但很稳定。

### Whisper API — 语音转录

使用 OpenAI 的 `whisper-1` 模型。用户在浏览器录音，前端把音频 blob POST 到 `/api/transcribe`，后端转发给 Whisper，返回转录文本，然后自动填入互动记录的文本框。

整个流程无需用户干预，录完音直接转，大约 2-3 秒出结果。中英文混录也处理得不错——这对我来说很重要，因为我记笔记经常中英混用。

### OpenWeatherMap — 天气小组件

这个功能完全是"因为好玩"加进来的。仪表盘右上角会根据当前天气显示不同的 emoji 动画：☀️ 晴天、🌧️ 雨天、❄️ 雪天、⛅ 多云……

说实话，这是我最喜欢的细节之一。每次打开仪表盘看到天气 emoji 在那里轻轻动，心情就会好一点。技术含量不高，但产品里的小 delight 是值得花时间做的。API 免费额度完全够个人使用。

---

## AI 技巧与实现

### 技巧一：结构化 Prompt + JSON 输出

会议准备卡的核心是让 Claude 从非结构化的互动记录里提炼出有价值的信息。关键在于 system prompt 的设计——要告诉模型输出什么格式，以及什么语气：

```typescript
// app/api/prep-card/route.ts
const systemPrompt = `你是一个私人助理，帮助用户在见面前做准备。
你会收到用户与某位联系人的所有互动记录。
请分析这些记录，生成一张会议准备卡。

你必须严格按照以下 JSON 格式返回，不要包含任何额外文字：
{
  "lastContext": "上次见面或联系时，对方在做什么、经历什么（1-2句话）",
  "topicsToExplore": ["可以继续聊的话题1", "话题2", "话题3"],
  "questionsToAsk": ["不要忘记问的问题1", "问题2"],
  "importantDates": ["需要记住的重要日期或截止日期"],
  "overallTone": "这段关系的整体氛围，用一个词概括"
}

注意：
- 只基于提供的互动记录，不要编造信息
- 如果记录不足，对应字段返回空数组或空字符串
- 语言风格要自然，像朋友之间说话，不要太正式`;

const userMessage = `联系人：${contact.name}
互动记录（按时间倒序）：

${interactions.map(i =>
  `[${new Date(i.date).toLocaleDateString('zh-CN')}] ${i.type}: ${i.content}`
).join('\n\n')}`;

const response = await anthropic.messages.create({
  model: 'claude-haiku-4-5',
  max_tokens: 1024,
  system: systemPrompt,
  messages: [{ role: 'user', content: userMessage }],
});

// 从返回文本提取 JSON
const text = response.content[0].type === 'text' ? response.content[0].text : '';
const jsonMatch = text.match(/\{[\s\S]*\}/);
if (jsonMatch) {
  const prepCard = JSON.parse(jsonMatch[0]);
  return NextResponse.json(prepCard);
}
```

### 技巧二：四个 AI 人格系统

这是一个有趣的设计决策。我不想让 Knowho 只有一个"AI 助理"的统一腔调，所以做了四个人格选项，用户可以切换：

- **Knowho**（默认）：中立、专业、信息密度高
- **苏苏**：睿智、有哲学感，回答总带点人生感悟
- **小暖**：温暖、共情强，像老朋友
- **明哥**：直接、不废话，直接给结论

实现方式很简单——每个人格对应一段额外的 system prompt 追加文字（`characterTone`），在发送给 Claude 前拼接进去：

```typescript
// lib/ai/characters.ts
const characterTones: Record<string, string> = {
  knowho: '', // 默认，不追加
  susu: '\n\n你的回答风格：智慧而有深度，喜欢用简短的哲学观点收尾，但不卖弄。',
  xiaowan: '\n\n你的回答风格：温暖、真诚，像一个真的很在乎用户的老朋友在说话。',
  mingge: '\n\n你的回答风格：直接、简洁，跳过废话，直接给最有用的信息。',
};

const finalSystemPrompt = systemPrompt + (characterTones[characterTone] ?? '');
```

四行代码，四种完全不同的体验。LLM 对 system prompt 的响应真的很敏感——光是加一句语气描述，输出的语调就会有明显变化。

### 技巧三：Prisma Schema 设计

数据模型的核心是 `Contact` 和 `Interaction`，所有涉及到的查询都过滤 `deletedAt: null`（软删除）：

```prisma
// prisma/schema.prisma
model Contact {
  id              String    @id @default(cuid())
  userId          String
  name            String
  email           String?
  phone           String?
  company         String?
  role            String?
  notes           String?
  avatar          String?   // null=首字母, emoji字符串=emoji, data:image=base64
  lastContactedAt DateTime?
  deletedAt       DateTime? // 软删除
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  user            User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  interactions    Interaction[]
  importantDates  ImportantDate[]
  tags            ContactTag[]

  @@index([userId, deletedAt])
}

model Interaction {
  id          String    @id @default(cuid())
  contactId   String
  userId      String
  type        String    // "meeting", "call", "message", "note"
  content     String    @db.Text
  date        DateTime  @default(now())
  sentiment   String?   // "positive", "neutral", "negative"
  deletedAt   DateTime?
  createdAt   DateTime  @default(now())

  contact     Contact   @relation(fields: [contactId], references: [id], onDelete: Cascade)
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([contactId, deletedAt])
  @@index([userId, date])
}
```

头像字段 `avatar` 的设计我想单独说一下。我一开始想用 S3 或者 Cloudflare R2 存头像图片，但这意味着要处理签名 URL、存储桶配置、CORS……对于一个个人项目来说太重了。

最后我的方案是：**直接存 base64 字符串进数据库**。是的，我知道这在"生产最佳实践"里是反模式，但对于个人用户量极小的私人工具，这完全够用。而且有一个额外的好处：可以把 emoji 当头像存进去。用户喜欢给联系人设置一个能代表他们的 emoji，这比上传照片有趣多了。

`null` = 显示姓名首字母（自动生成带颜色的块）
`"🧠"` = 显示 emoji
`"data:image/jpeg;base64,..."` = 显示真实图片

三种状态，一个字段，干净。

### 技巧四：Edge Runtime / Node.js 分离

NextAuth v5 在 Edge Runtime 下有限制：不能直接使用 Prisma（因为 Prisma 依赖 Node.js API）。解决方案是把认证逻辑分成两个文件：

```typescript
// auth.config.ts — Edge 安全，只用 JWT，不碰数据库
import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

export const authConfig: NextAuthConfig = {
  providers: [Google],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      if (isOnDashboard) return isLoggedIn;
      return true;
    },
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
};
```

```typescript
// auth.ts — Node.js 环境，完整 Prisma adapter
import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { authConfig } from './auth.config';

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
});
```

`middleware.ts` 引用 `auth.config.ts`（Edge 安全），API 路由引用 `auth.ts`（完整功能）。这个分离是 NextAuth v5 的官方推荐模式，但文档里说得不够清楚，我踩坑之后才完全理解。后来用 `superpowers:systematic-debugging` 做根因分析，发现错误根源不是 Prisma 配置，而是 middleware 引用了错误的文件——这个区别很重要。

### 技巧五：Promise.all 仪表盘并行查询

仪表盘需要展示"久未联系的人"、"近期生日"、"总统计数据"……如果顺序查询，每个查询 200ms，加起来就是 600ms+。

用 `Promise.all` 并行发出所有查询：

```typescript
// app/api/dashboard/route.ts
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // 全部并行发出，等最慢的那个完成
  const [
    totalContacts,
    neglectedContacts,
    upcomingBirthdays,
    recentInteractions,
    totalInteractions,
  ] = await Promise.all([
    // 总联系人数
    prisma.contact.count({
      where: { userId, deletedAt: null },
    }),

    // 30 天未联系
    prisma.contact.findMany({
      where: {
        userId,
        deletedAt: null,
        OR: [
          { lastContactedAt: { lt: thirtyDaysAgo } },
          { lastContactedAt: null },
        ],
      },
      orderBy: { lastContactedAt: 'asc' },
      take: 5,
      select: { id: true, name: true, avatar: true, lastContactedAt: true },
    }),

    // 近 7 天生日
    prisma.importantDate.findMany({
      where: {
        userId,
        type: 'birthday',
        date: { gte: now, lte: sevenDaysFromNow },
      },
      include: { contact: { select: { id: true, name: true, avatar: true } } },
    }),

    // 最近 5 条互动
    prisma.interaction.findMany({
      where: { userId, deletedAt: null },
      orderBy: { date: 'desc' },
      take: 5,
      include: { contact: { select: { id: true, name: true } } },
    }),

    // 总互动数
    prisma.interaction.count({
      where: { userId, deletedAt: null },
    }),
  ]);

  return NextResponse.json({
    stats: { totalContacts, totalInteractions },
    neglectedContacts,
    upcomingBirthdays,
    recentInteractions,
  });
}
```

响应时间从顺序查询的 ~600ms 降到 ~200ms。这种优化在大项目里是常识，但在自己的小项目里真正测出来那个数字，还是挺有成就感的。

### 技巧六：Zod 验证 + MediaRecorder 跨浏览器兼容

所有 API 路由的入口都用 Zod 验证，一开始就加，不等到"以后再加"：

```typescript
// lib/validations/contact.ts
import { z } from 'zod';

export const updateContactSchema = z.object({
  name: z.string().min(1, '姓名不能为空').max(100).optional(),
  email: z.string().email('邮箱格式不正确').nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  company: z.string().max(100).nullable().optional(),
  role: z.string().max(100).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  avatar: z.string().nullable().optional(), // null | emoji | base64
  tags: z.array(z.string().cuid()).optional(),
});

export type UpdateContactInput = z.infer<typeof updateContactSchema>;
```

```typescript
// MediaRecorder 跨浏览器兼容
// components/VoiceRecorder.tsx
function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus', // Chrome, Edge
    'audio/webm',             // Chrome fallback
    'audio/mp4',              // Safari
    'audio/ogg;codecs=opus',  // Firefox
    'audio/ogg',              // Firefox fallback
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return ''; // 让浏览器选默认格式
}

// 使用时
const mimeType = getSupportedMimeType();
const recorder = new MediaRecorder(
  stream,
  mimeType ? { mimeType } : undefined
);
```

Safari 用 `audio/mp4`，Chrome 用 `audio/webm`——不处理这个差异的话，Safari 用户录音会直接报错。这是那种"只有真正在多个浏览器测试才会踩到"的坑。

---

## Vibe Coding 过程

这个项目是我认真实践 vibe coding 的一次尝试。所谓 vibe coding，不是"让 AI 帮你写代码然后你 copy paste"，而是一种更深度的 AI 协作开发模式。我用的是 Claude Code，以及一系列专门设计的 slash commands。

### 我的工作流

**第一步：编码前用 `/superpowers:brainstorming` 探索意图**

每次要做一个新功能，我不直接动手写代码，而是先和 Claude 对话，把想法说清楚。这个 skill 会帮我探索：用户真正需要什么？这个功能解决的核心问题是什么？有没有更简单的实现方式？

比如做会议准备卡功能时，我最初的想法很模糊——"就是让 AI 帮我总结一下这个人"。经过 brainstorming，我明确了：用户需要的是"行动导向的信息"，不是摘要，而是具体的话题和问题。这个认知直接影响了 prompt 的设计。

**第二步：用 `/superpowers:writing-plans` 生成带文件路径的实现计划**

想清楚之后，我会让 Claude 生成一份完整的实现计划，包括：需要创建/修改哪些文件、每个文件里要写什么、API 的入参出参格式、数据库 schema 变更。

这份计划是我和 Claude 之间的"合约"——后续开发都围绕这份计划展开，避免走偏。计划里会包含具体的文件路径，比如 `app/api/prep-card/route.ts`、`components/PrepCard.tsx`，让执行阶段更清晰。

**第三步：`/superpowers:subagent-driven-development` — 独立 agent 执行每个任务**

实现阶段，每个独立的任务（比如"实现 Whisper 转录 API"、"做 MediaRecorder 录音组件"）都交给独立的 sub-agent 执行，完成后质量审查。

这种方式的好处是：每个 agent 的上下文是干净的，不会被其他任务的噪音干扰。质量也更可控——做完一个，检查一个，不合格退回重做。

**第四步：`/superpowers:systematic-debugging` — 根因分析**

遇到 bug 的时候，这个 skill 强迫我（和 Claude）先做根因分析，再动手修。我之前的坏习惯是遇到报错直接猜，改了这里再改那里，结果越改越乱。

最典型的一次是 NextAuth 的 Edge Runtime 报错：`PrismaClient is unable to run in this browser environment`。如果直接猜，可能会去改 Prisma 配置，或者加各种 webpack externals……但根因分析告诉我：`middleware.ts` 引用了完整的 `auth.ts`（包含 Prisma），而 middleware 运行在 Edge Runtime。解决方案是把 `auth.config.ts` 分离出来。十分钟解决，之前我卡了一个小时。

**第五步：`/superpowers:verification-before-completion` — 完成前实际验证**

每个功能做完，不只是"代码写完了"就算完——要实际跑起来，在浏览器里操作一遍，确认行为符合预期。这个习惯帮我在"提交"之前发现了好几个"代码逻辑对但 UI 交互体验差"的问题，比如录音按钮松开后没有 loading 状态、生成卡片时没有 skeleton 占位……这些都不是 bug，但会显著影响体验。

### 一个具体的功能开发示例：久未联系提醒

"久未联系的人"是我最喜欢的功能，也是让我觉得这个项目真的有价值的功能。仪表盘首页会直接显示：你有 X 天没联系 Ta 了。

开发过程：

1. **Brainstorming**：我想要的不只是一个列表，而是让我感到"有点愧疚但同时被推着去做点什么"的界面。用什么时间阈值？30 天？我最后决定不用固定阈值，而是按"上次联系时间"排序，把最久没联系的放最前面，让用户自己判断。

2. **计划**：`lastContactedAt` 字段更新逻辑（每次添加互动时自动更新）、仪表盘查询（排序 + 限制 5 条）、UI 展示（天数 badge + 快速行动按钮）。

3. **实现**：每次创建 Interaction 时，用事务同时更新 `Contact.lastContactedAt`：

```typescript
// 创建互动时同时更新联系时间（原子操作）
const [interaction] = await prisma.$transaction([
  prisma.interaction.create({
    data: { contactId, userId, type, content, date: interactionDate },
  }),
  prisma.contact.update({
    where: { id: contactId },
    data: { lastContactedAt: interactionDate },
  }),
]);
```

4. **验证**：手动创建几个联系人，设置不同的 `lastContactedAt`，确认仪表盘排序正确，"X 天前"的文字显示正确，点击快速跳转到联系人详情正常工作。

这个功能开发前后大概 2 小时，其中 1 小时是 brainstorming 和计划，30 分钟是写代码，30 分钟是验证和调整 UI 细节。典型的 vibe coding 比例：想清楚的时间 > 写代码的时间。

---

## 页面功能介绍

**仪表盘（Dashboard）**

首屏最重要的信息：久未联系的人（默认显示前 5，天数越多越靠前）、近 7 天生日、最近互动记录、总体统计数字。右上角天气小组件，根据实时天气显示 emoji 动画。这是我每天打开 app 的第一个页面——打开的那一刻，我就知道今天需要联系谁。

**联系人列表**

所有联系人，支持搜索（按姓名/公司/备注）和按标签过滤。每张卡片显示：头像（首字母/emoji/图片）、姓名、公司/职位、上次联系时间。点击任意联系人进入详情页。

**联系人详情（互动时间线）**

这个人的所有信息：基本资料、标签、重要日期，以及按时间倒序排列的所有互动记录。每条互动记录可以标记情绪（正面/中性/负面），方便回顾当时的状态。时间线的视觉设计让你能直观感受到这段关系的"频率"——如果时间线里出现了一个大空白，你就会意识到很久没联系了。

**添加互动**

支持文字输入和语音输入。语音按钮按住录音，松开自动转录，转录结果填入文本框，可以手动编辑后保存。选择互动类型（会面/通话/消息/笔记）和日期。这个页面我刻意做得很轻——打开、说几句话、保存，整个流程不超过 30 秒。

**会议准备卡**

输入联系人名字（或从联系人详情页跳转），选择 AI 人格（Knowho/苏苏/小暖/明哥），点击"生成"。等待 1-2 秒，卡片生成。可以选择让 AI 用语音朗读准备卡内容（`speechSynthesis`，不需要 API key，完全免费）。适合出门前在路上听。

**重要日期日历**

所有联系人的生日、纪念日、截止日期等，以日历形式展示。点击具体日期查看详情，近 7 天的事件在仪表盘上也会提醒。比 Google Calendar 轻量，比备忘录聪明。

**标签浏览器**

按标签分类浏览联系人。比如给导师们打"mentor"标签，给同一个公司的人打公司名标签，给特别重要的人打"VIP"……完全自定义，系统不预设任何分类。

---

## 示例：AI 会议准备卡如何运作

让我用一个具体例子走一遍完整流程。

**场景：** 我下午要和张伟见面，他是我三年前的同事，现在自己创业。我们大概四个月没见了。

**第一步：我的历史记录**

系统里关于张伟的互动记录（简化版）：

```
[2026-02-10] 会面: 在咖啡馆见面，他说融资进展顺利，A 轮快谈完了。
聊了他们产品的定价策略，他在纠结 freemium 还是直接收费。
提到他老婆怀孕了，预产期在 6 月。

[2025-12-20] 消息: 他发消息说产品正式上线了，发了个链接给我，
我试用了一下，体验不错，回复说很棒。

[2025-10-05] 通话: 他打来问我对 B2B SaaS 定价有没有了解，
聊了大概 20 分钟，我给他分享了几篇文章。

[2025-08-15] 会面: 第一次知道他在创业，还在 idea 阶段，
做的是面向中小企业的数据分析工具。非常兴奋，但压力也很大。
```

**第二步：发送给 Claude Haiku**

系统把这四条互动记录格式化后，连同 system prompt 一起发给 Claude Haiku，总 token 数大约 800，费用不到 $0.001。

**第三步：Claude 返回的真实 JSON**

```json
{
  "lastContext": "张伟的创业公司 A 轮融资接近尾声，产品已正式上线。他老婆预产期在 6 月，现在孩子应该已经出生了。",
  "topicsToExplore": [
    "A 轮融资最终结果如何，完成后公司规模和节奏有什么变化",
    "产品上线半年后的真实用户数据和反馈",
    "freemium 还是直接付费，当时那个定价问题有没有最终决策"
  ],
  "questionsToAsk": [
    "孩子出生了吗？一切都顺利吗？",
    "融资完成后团队扩大了多少？",
    "现在面临的最大挑战是什么"
  ],
  "importantDates": [
    "老婆预产期 6 月——孩子应该已经出生，这是最重要的事，先问这个"
  ],
  "overallTone": "成长中"
}
```

**第四步：展示给用户**

界面把这个 JSON 渲染成一张清晰的卡片，每个部分都有视觉分隔和 emoji 图标。最重要的一点："孩子出生了吗？"——这个问题如果不是 AI 从四个月前的记录里挖出来，我见面时极有可能完全忘了这件事。见面开头就问这个，对方会觉得你真的在意他。

**第五步：语音朗读（可选）**

点击"朗读"按钮，浏览器 `speechSynthesis` 会把准备卡的内容朗读出来。适合在出门走路的时候听。完全不需要 API，用浏览器内置的 TTS，中文支持也还不错——我选的是"Ting-Ting"声音，语速调到 0.9x，听起来比较自然。

这就是 Knowho 真正的价值所在：不只是帮你记住信息，而是在对的时候把对的信息推到你面前。

---

## 我学到了什么

### 技术层面

**Edge Runtime 的限制比我想象的多。** Next.js 的 App Router 很强大，但也带来了更多需要管理的心智模型：Server Component vs Client Component，Edge vs Node.js，`fetch` 缓存策略……每一个决策点都有代价，没有"随便写都行"这回事。

**`Promise.all` 是随手可用但经常被忽略的优化。** 对于个人项目，200ms vs 600ms 可能没人在意，但养成这个习惯，到了大型项目会很自然地复用。数据库查询能并行的，就不要顺序写。

**Zod 验证应该在一开始就加，不要等到"以后再加"。** 以后永远不加。从第一个 API 路由开始就写 Zod schema，后来几乎没有因为数据格式问题调试过 bug。

**软删除（`deletedAt` 字段）让我少了很多"删了还想找回来"的焦虑。** 几乎所有用户数据都值得用软删除而不是硬删除。代价只是每个查询多加一个 `deletedAt: null` 过滤条件，完全值得。

**base64 头像比 S3 简单太多，对个人项目来说完全够用。** 不是所有决策都要按照"生产最佳实践"来——要看场景。个人工具，用户量极小，数据量极小，选最简单的实现方案，先跑起来再说。

### 产品层面

**"久未联系"这个功能是我用得最频繁的。** 每次打开仪表盘，看到列表里某个名字旁边显示"67 天前"，我就会意识到：哦，我已经两个多月没联系她了，发条消息吧。这种 nudge 比任何 to-do 工具都管用，因为它不是我主动去看的提醒，而是顺手就看到了。

**天气小组件什么都不影响，但每次看到它都会让我多待一秒钟。** 产品里的小 delight 是值得花时间做的。用户（哪怕只是我自己）的情绪状态会影响他们使用产品的频率。一个让你打开时心情好一点的界面，就是一个更好的工具。

**语音输入的使用频率比我预期高很多。** 我以为自己会主要用文字，但事实是：下班路上走路、刚见完某人走出门口——这些时候用语音记录比用文字方便太多。Whisper 的中文识别准确率让我很惊喜，甚至能准确识别人名和行业词汇。

### AI 协作层面

**Vibe coding 不是"让 AI 替你思考"，而是"和 AI 一起思考更快"。** 最有价值的不是让 AI 写代码，而是在做决策的时候让它快速验证你的想法，或者提出你没考虑到的角度。

**`superpowers:systematic-debugging` 改变了我处理 bug 的方式。** 先分析根因，再动手修，听起来是常识，但在压力下很容易跳过这一步。有一个强制你做这件事的流程，真的有帮助。这个原则现在已经内化了，即使不用这个 skill，我也会先停下来想"根本原因是什么"。

**计划很重要，但计划可以变。** `superpowers:writing-plans` 生成的实现计划不是圣旨——遇到新情况可以更新。重要的是有一个共同的参照点，让你和 AI 都清楚"我们在做什么，现在做到哪里了"。

---

Knowho 还在开发中，还有很多想做的功能：联系人导入（从手机通讯录）、互动提醒（"你上次说要介绍 A 和 B 认识，还没做"）、AI 生成的"关系健康度"分析……

但现在这个版本已经够我自己用了。

这就够了。一个工具如果能解决你自己的真实问题，你就会有持续维护它的动力。这比任何产品方法论都更重要。

---

*如果你也有"总是忘记朋友在做什么"的困扰，欢迎来 GitHub 看看：[https://github.com/sarahwangy/knowho](https://github.com/sarahwangy/knowho)*

*有问题或者想法，欢迎在评论区聊。*
