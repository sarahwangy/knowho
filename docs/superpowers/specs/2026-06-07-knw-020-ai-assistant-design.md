# KNW-020 — AI 助手设计

**日期：** 2026-06-07
**负责人：** Sarah

---

## 范围

悬浮 AI 助手，支持两个模式：
- **模式 A（自由对话）**：自然语言查询联系人
- **模式 B（录入助手）**：解析自然语言 → 预填新建联系人表单

**不在范围内：** 聊天记录持久化、多轮上下文跨会话保留、流式输出（首版非流式）、修改/删除联系人。

---

## 文件

| 文件 | 操作 |
|------|------|
| `app/api/ai/chat/route.ts` | 新建 — POST /api/ai/chat |
| `components/ai-assistant.tsx` | 新建 — 聊天 UI 组件 |
| `app/layout.tsx` | 修改 — 引入 AiAssistant |

---

## API：POST /api/ai/chat

**Auth：** 需要登录，未登录返回 401。

**Request Body：**
```json
{
  "messages": [
    { "role": "user", "content": "有做设计的朋友吗？" }
  ],
  "mode": "chat"
}
```

**mode：** `"chat"` | `"record"`

**逻辑（mode=chat）：**
1. 加载当前用户所有联系人摘要（姓名、认识场合、印象、标签、最近互动日期）。
2. 将摘要以 system prompt 形式注入：「你是用户的私人关系助手，以下是他的联系人列表：...」
3. 调用 Anthropic `claude-haiku-4-5-20251001`，`max_tokens: 512`。
4. 返回 `{ "reply": "..." }`。

**逻辑（mode=record）：**
1. System prompt 固定为解析指令：
   「从用户的描述中提取联系人信息，返回 JSON：{ name, metAt, impression, tags[] }。无法确定的字段留空字符串。只返回 JSON，不要其他内容。」
2. 调用 `claude-haiku-4-5-20251001`，`max_tokens: 256`。
3. 解析返回的 JSON，验证结构，返回 `{ "fields": { name, metAt, impression, tags } }`。
4. JSON 解析失败 → 返回 422 `{ "error": "parse_failed" }`。

**错误：** Anthropic API 失败 → 500。联系人加载失败 → 500。

**环境变量：** `ANTHROPIC_API_KEY`

**runtime：** `export const runtime = "nodejs"`

---

## 组件：AiAssistant

Client Component，放在 `app/layout.tsx` 中全局挂载（登录后可见）。

### 状态机

```
关闭 → 点击气泡 → 打开（模式选择 or 直接聊天）
打开 → 点击关闭/背景 → 关闭
```

### 入口

左下角悬浮气泡：`fixed bottom-6 left-6`，圆形按钮，✨ 图标，`bg-[#3d6b2e]`。

### 打开后 UI

底部弹出面板（`fixed bottom-0 inset-x-0`，`max-w-2xl mx-auto`，`rounded-t-2xl bg-white`，`max-h-[70vh]`）：

顶部：两个模式 tab — 「💬 对话」| 「✍️ 录入」，默认「对话」

**对话模式：**
- 消息列表区域（可滚动）
- 底部输入框 + 发送按钮 + 麦克风按钮（接 KNW-021）
- 消息气泡：用户右对齐（`bg-[#3d6b2e] text-white`），AI 左对齐（`bg-[#f0f0f0]`）
- 上下文仅存 `useState`，关闭面板清空

**录入模式：**
- 输入框：大文本区，placeholder「描述你认识的新朋友…」
- 「解析」按钮（`bg-[#3d6b2e]`）
- 解析成功 → 显示预览卡片（姓名/场合/印象/标签），「确认，去填表」按钮
- 点击确认 → `router.push("/new-person?name=...&metAt=...&impression=...&tags=...")`（URL 参数传递）
- `/new-person` 页面读取 URL 参数预填字段

### 加载状态

发送中：输入框 disabled，按钮显示 spinner。

### 错误处理

API 失败 → 消息列表末尾显示红色错误提示，不清空历史。

---

## new-person 页面修改

读取 URL search params：`name`, `metAt`, `impression`, `tags`（逗号分隔）→ 预填对应字段的 defaultValue。

用 `useSearchParams()` 读取，仅在首次挂载时应用。
