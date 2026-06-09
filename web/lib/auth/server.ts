import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"
import { siwn } from "better-near-auth"
import { prisma } from "../db"

const trustedOrigins = Array.from(
  new Set(
    [process.env.BETTER_AUTH_URL, process.env.NEXT_PUBLIC_APP_URL].filter(
      (origin): origin is string => Boolean(origin)
    )
  )
)

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    },
  },
  account: {
    accountLinking: {
      enabled: false,
      disableImplicitLinking: true,
    },
  },
  plugins: [
    siwn({
      recipient: process.env.BETTER_AUTH_URL!,
      requireFullAccessKey: false,
    }),
    nextCookies(),
  ],
})

export type AuthSession = typeof auth.$Infer.Session
