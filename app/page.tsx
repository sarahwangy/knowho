// app/page.tsx
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function Home() {
  const session = await auth()
  redirect(session ? "/people" : "/login")
}
