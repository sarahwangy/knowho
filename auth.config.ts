import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"

export const authConfig = {
  providers: [Google],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" as const },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const { pathname } = nextUrl

      const isPublicRoute =
        pathname.startsWith("/login") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/s/")

      if (isLoggedIn && pathname === "/login") {
        return Response.redirect(new URL("/people", nextUrl))
      }
      if (!isLoggedIn && !isPublicRoute) return false
      return true
    },
  },
} satisfies NextAuthConfig
