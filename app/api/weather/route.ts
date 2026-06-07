import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const lat = parseFloat(searchParams.get("lat") ?? "")
  const lon = parseFloat(searchParams.get("lon") ?? "")

  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 })
  }

  const apiKey = process.env.OPENWEATHERMAP_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Weather API not configured" }, { status: 503 })
  }

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=zh_cn`,
      { next: { revalidate: 600 } }
    )
    if (!res.ok) {
      return NextResponse.json({ error: "Weather fetch failed" }, { status: 502 })
    }
    const data = await res.json()
    return NextResponse.json({
      temp: Math.round(data.main.temp),
      description: data.weather[0]?.description ?? "",
      icon: data.weather[0]?.icon ?? "",
      city: data.name ?? "",
    })
  } catch {
    return NextResponse.json({ error: "Weather fetch failed" }, { status: 502 })
  }
}
