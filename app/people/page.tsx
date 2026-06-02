// app/people/page.tsx
import { auth } from "@/auth"

export default async function PeoplePage() {
  const session = await auth()

  return (
    <main className="min-h-screen bg-[#f7f4f1] p-6">
      <p className="text-[#2d2926] font-semibold">
        ✅ 已登录：{session?.user?.email}
      </p>
      <p className="text-sm text-[#8b7d72] mt-2">
        联系人列表页（KNW-004，待实现）
      </p>
    </main>
  )
}
