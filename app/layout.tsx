import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { Nav } from "@/components/nav"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Knowho",
  description: "Remember everyone you meet.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body className={`${geist.className} pb-16 md:pt-14 bg-[#7a9e6a]`}>
        <Nav />
        <div className="max-w-2xl mx-auto w-full">
          {children}
        </div>
      </body>
    </html>
  )
}
