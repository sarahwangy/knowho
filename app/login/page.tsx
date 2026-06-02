// app/login/page.tsx
import { signIn, auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function LoginPage() {
  const session = await auth()
  if (session) redirect("/people")

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#f7f4f1] px-6">
      <div className="w-full max-w-sm flex flex-col items-center">

        {/* Blinking face logo */}
        <div
          className="mb-5 w-[72px] h-[72px] rounded-full flex items-center justify-center"
          style={{ background: "rgba(192,87,58,0.10)", border: "1.5px solid rgba(192,87,58,0.30)" }}
        >
          <svg viewBox="0 0 32 32" fill="none" width="52" height="52" style={{ display: "block", overflow: "visible" }}>
            <circle cx="16" cy="16" r="11" stroke="#c0573a" strokeWidth="1.8" />
            <g fill="#c0573a" style={{ animation: "kwBlink 5.4s infinite", transformBox: "fill-box", transformOrigin: "center" }}>
              <circle cx="12" cy="14.5" r="1.7" />
              <circle cx="20" cy="14.5" r="1.7" />
            </g>
            <path d="M11.5 19.5 Q16 23.5 20.5 19.5" stroke="#c0573a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-[#2d2926] mb-2">Knowho</h1>
        <p className="text-sm text-[#8b7d72] text-center leading-relaxed mb-10">
          帮你记住每一个认识的人，<br />下次见面更有温度
        </p>

        {/* Feature list */}
        <div className="w-full flex flex-col gap-3 mb-10">
          {(
            [
              { icon: "⚡", bg: "#fff0e8", text: "30秒记下一个新朋友" },
              { icon: "🎂", bg: "#eaf5ee", text: "自动提醒生日、重要纪念日" },
              { icon: "💬", bg: "#e8f0ff", text: "见面前快速回顾，聊天不尬场" },
            ] as const
          ).map(({ icon, bg, text }) => (
            <div key={icon} className="flex items-center gap-3">
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: bg }}
              >
                {icon}
              </span>
              <span className="text-sm text-[#4a3d35]">{text}</span>
            </div>
          ))}
        </div>

        {/* Sign in button — Server Action */}
        <form
          action={async () => {
            "use server"
            await signIn("google", { redirectTo: "/people" })
          }}
          className="w-full"
        >
          <button
            type="submit"
            className="w-full h-[52px] flex items-center justify-center gap-3 rounded-2xl bg-white border border-[#e0d8d2] text-[#2d2926] font-semibold text-[15px] shadow-sm hover:bg-[#faf8f6] transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            用 Google 账号登录
          </button>
        </form>

        <p className="mt-4 text-xs text-[#a89990] text-center leading-relaxed">
          登录即代表你同意我们的服务协议<br />我们不会向你推销任何东西 🙂
        </p>
      </div>

      <style>{`
        @keyframes kwBlink {
          0%, 92%, 100% { transform: scaleY(1); }
          96% { transform: scaleY(0.1); }
        }
      `}</style>
    </main>
  )
}
