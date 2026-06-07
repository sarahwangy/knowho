# KNW-021 — 语音输入设计

**日期：** 2026-06-07
**负责人：** Sarah

**依赖：** KNW-020（AI 助手）必须先完成。语音转文字后的解析逻辑复用 `/api/ai/chat?mode=record`。

---

## 范围

在两个入口支持语音录入，通过 OpenAI Whisper API 转为文字：
1. AI 助手输入框旁的麦克风按钮
2. 新建联系人页「语音备注」按钮（目前 disabled）

**不在范围内：** 实时流式转录、语音指令、Safari 兼容性保证（MediaRecorder 在 Safari 15+ 支持）。

---

## 文件

| 文件 | 操作 |
|------|------|
| `app/api/voice/transcribe/route.ts` | 新建 — POST /api/voice/transcribe |
| `components/mic-button.tsx` | 新建 — 录音按钮组件 |
| `components/ai-assistant.tsx` | 修改 — 集成 MicButton |
| `app/new-person/page.tsx` | 修改 — 启用语音备注按钮 |

---

## API：POST /api/voice/transcribe

**Auth：** 需要登录，未登录返回 401。

**Request：** `multipart/form-data`，字段名 `audio`，文件类型 `audio/webm` 或 `audio/mp4`。

**限制：** 文件大小 ≤ 10MB（Whisper 限制 25MB，保守取 10MB）。

**逻辑：**
1. 从 formData 读取 audio 文件，检查大小。
2. 调用 OpenAI Whisper：`openai.audio.transcriptions.create({ model: "whisper-1", file, language: "zh" })`。
3. 返回 `{ "text": "今天认识了小明..." }`。

**错误：**
- 无文件 / 超大 → 400
- Whisper 调用失败 → 502

**环境变量：** `OPENAI_API_KEY`

**runtime：** `export const runtime = "nodejs"`

---

## 组件：MicButton

Client Component，可复用。

**Props：**
```ts
interface MicButtonProps {
  onTranscript: (text: string) => void
  onError?: (msg: string) => void
  disabled?: boolean
}
```

**状态：** `idle` | `recording` | `processing`

**UI：**
- idle：麦克风图标（`Mic`，lucide），`text-[#8b7d72]`
- recording：红色脉冲动画（`text-red-500 animate-pulse`），点击停止
- processing：spinner，disabled

**交互流程：**
1. 点击 → `idle` 变 `recording`，调用 `navigator.mediaDevices.getUserMedia({ audio: true })`。
2. 使用 `MediaRecorder`，格式优先 `audio/webm`（Chrome），降级 `audio/mp4`（Safari）。
3. 再次点击（或超时 60 秒）→ 停止录制，`recording` 变 `processing`。
4. 将音频 Blob POST 到 `/api/voice/transcribe`。
5. 成功 → 调 `onTranscript(text)`，变回 `idle`。
6. 失败 → 调 `onError("录音转换失败，请重试")`，变回 `idle`。

**权限被拒绝：** 调 `onError("需要麦克风权限")`，不改变状态。

---

## 集成：AI 助手（components/ai-assistant.tsx）

对话模式和录入模式的输入框旁各加一个 `<MicButton>`。

- 对话模式：`onTranscript` → 将文字填入输入框，自动发送
- 录入模式：`onTranscript` → 将文字填入大文本区，不自动解析（用户确认后手动点「解析」）

---

## 集成：新建联系人页（app/new-person/page.tsx）

将现有的 disabled 「语音备注」按钮替换为 `<MicButton>`：

- `onTranscript` → 将文字填入 `impression` 字段（textarea）
- `onError` → 在页面顶部显示短暂错误提示（3秒后消失）

录音按钮紧贴「让你记住 Ta 的那件事」输入框下方。
