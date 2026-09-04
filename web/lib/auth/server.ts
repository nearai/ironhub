import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"
import { organization } from "better-auth/plugins"
import { siwn } from "better-near-auth"
import { prisma } from "../db"
import { hasReachedOrganizationLimit } from "../orgs/limits"
import { getInitialOrganization } from "./organization"

const configuredOrigins = (process.env.TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)

const trustedOrigins = Array.from(
  new Set(
    [
      process.env.BETTER_AUTH_URL,
      process.env.NEXT_PUBLIC_APP_URL,
      ...configuredOrigins,
    ].filter((origin): origin is string => Boolean(origin))
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
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 30,
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => ({
          data: {
            ...session,
            activeOrganizationId: (await getInitialOrganization(session.userId))
              .id,
          },
        }),
      },
    },
  },
  plugins: [
    siwn({
      recipient: process.env.BETTER_AUTH_URL!,
      requireFullAccessKey: false,
    }),
    organization({
      // Caps how many organizations one account can create. Counts owner
      // memberships only, so being invited into other workspaces never eats
      // into the quota. Returning `true` means "limit reached".
      organizationLimit: async (user) =>
        hasReachedOrganizationLimit(
          await prisma.member.count({
            where: { userId: user.id, role: "owner" },
          })
        ),
      // In-app invitations only: no email is ever sent, invitations surface in
      // the workspace notification bell. 7-day expiry per the org-invitations spec.
      invitationExpiresIn: 60 * 60 * 24 * 7,
      requireEmailVerificationOnInvitation: false,
    }),
    nextCookies(),
  ],
})

export type AuthSession = typeof auth.$Infer.Session
