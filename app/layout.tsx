import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { Nav } from "@/components/nav"
import { AiAssistant } from "@/components/ai-assistant"
import { auth } from "@/auth"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Knowho",
  description: "Remember everyone you meet.",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  return (
    <html lang="zh">
      <body className={`${geist.className} pb-16 md:pt-14 bg-gradient-to-br from-[#b2d0a0] via-[#8ab87a] to-[#5a8a50] min-h-screen`}>
        <Nav />
        {session?.user && <AiAssistant />}
        <div className="max-w-2xl mx-auto w-full">
          {children}
        </div>
      </body>
    </html>
  )
}
