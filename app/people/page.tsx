import { auth } from "@/auth"
import Link from "next/link"
import { Plus } from "lucide-react"

export default async function PeoplePage() {
  const session = await auth()

  return (
    <main className="min-h-screen bg-[#f7f4f1] p-6 relative">
      <p className="text-[#2d2926] font-semibold">
        ✅ 已登录：{session?.user?.email}
      </p>
      <p className="text-sm text-[#8b7d72] mt-2">
        联系人列表页（KNW-004，待实现）
      </p>

      {/* FAB */}
      <Link
        href="/new-person"
        className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-[#2d2926] px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-[#3d3533]"
      >
        <Plus className="h-4 w-4" />
        认识新朋友了？
      </Link>
    </main>
  )
}
