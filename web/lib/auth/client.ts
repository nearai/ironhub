"use client"

import { createAuthClient } from "better-auth/react"
import { siwnClient } from "better-near-auth/client"

export const authClient = createAuthClient({
  plugins: [
    siwnClient({
      recipient: process.env.NEXT_PUBLIC_APP_URL!,
      networkId: "mainnet",
    }),
  ],
})
