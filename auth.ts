// auth.ts
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db"

const PRESET_TAGS = ["读书会", "健身群", "邻居", "工作", "社群", "家人", "朋友", "其他"]

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    session({ session, user }) {
      if (!user?.id) throw new Error("User ID missing from database record")
      session.user.id = user.id
      return session
    },
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.id) {
        try {
          await Promise.all(
            PRESET_TAGS.map((name) =>
              prisma.tag.upsert({
                where: { userId_name: { userId: user.id!, name } },
                update: {},
                create: { userId: user.id!, name, isPreset: true },
              })
            )
          )
        } catch (error) {
          console.error("Failed to seed preset tags for user", user.id, error)
        }
      }
      return true
    },
  },
})
