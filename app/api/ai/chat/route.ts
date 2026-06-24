import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  let body: { messages: { role: "user" | "assistant"; content: string }[]; mode: string; characterTone?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { messages, mode, characterTone } = body
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 })
  }

  try {
    if (mode === "record") {
      const userText = messages[messages.length - 1].content
      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        system: `从用户的描述中提取联系人信息，只返回以下 JSON，不要其他内容：
{"name":"","metAt":"","impression":"","tags":[]}
无法确定的字段留空字符串。tags 是字符串数组。`,
        messages: [{ role: "user", content: userText }],
      })
      const raw = response.content[0].type === "text" ? response.content[0].text : ""
      try {
        const fields = JSON.parse(raw)
        return NextResponse.json({ fields })
      } catch {
        return NextResponse.json({ error: "parse_failed" }, { status: 422 })
      }
    }

    // mode === "chat"
    const contacts = await prisma.contact.findMany({
      where: { userId, deletedAt: null },
      select: {
        name: true,
        metAt: true,
        impression: true,
        contactFreq: true,
        tags: { select: { name: true } },
        interactions: {
          orderBy: { date: "desc" },
          take: 1,
          select: { date: true },
        },
      },
    })

    const contactSummary = contacts
      .map((c) => {
        const tags = c.tags.map((t) => t.name).join("、")
        const last = c.interactions[0]?.date.toISOString().slice(0, 10) ?? "从未"
        return `- ${c.name}（认识于：${c.metAt ?? "未知"}；印象：${c.impression ?? "无"}；标签：${tags || "无"}；最近互动：${last}）`
      })
      .join("\n")

    const toneSuffix = typeof characterTone === "string" && characterTone ? `\n\n${characterTone}` : ""
    const systemPrompt = contacts.length > 0
      ? `你是用户的私人关系助手，帮助他回忆和维护人际关系。用户的联系人如下：\n${contactSummary}\n\n请用中文简洁回答。不要使用 markdown 格式（不要用 ** 加粗、不要用 - 列表），直接用自然语言表达。如果需要列举多人，每人单独一行。${toneSuffix}`
      : `你是用户的私人关系助手，用户目前还没有添加任何联系人。请用中文回答。不要使用 markdown 格式，直接用自然语言表达。${toneSuffix}`

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    })

    const reply = response.content[0].type === "text" ? response.content[0].text : ""
    return NextResponse.json({ reply })
  } catch {
    return NextResponse.json({ error: "AI request failed" }, { status: 500 })
  }
}
