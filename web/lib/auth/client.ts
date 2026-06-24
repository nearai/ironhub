"use client"

import { organizationClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"
import { siwnClient } from "better-near-auth/client"

export const authClient = createAuthClient({
  plugins: [
    organizationClient(),
    siwnClient({
      recipient: process.env.NEXT_PUBLIC_APP_URL!,
      networkId: "mainnet",
    }),
  ],
})
