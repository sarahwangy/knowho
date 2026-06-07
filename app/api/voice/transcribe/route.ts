import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { auth } from "@/auth"

export const runtime = "nodejs"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const audioFile = formData.get("audio")
  if (!audioFile || !(audioFile instanceof Blob)) {
    return NextResponse.json({ error: "audio field required" }, { status: 400 })
  }

  if (audioFile.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 })
  }

  try {
    const file = new File([audioFile], "recording.webm", { type: audioFile.type || "audio/webm" })
    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file,
      language: "zh",
    })
    return NextResponse.json({ text: transcription.text })
  } catch {
    return NextResponse.json({ error: "Transcription failed" }, { status: 502 })
  }
}
