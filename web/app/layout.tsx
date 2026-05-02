import type { Metadata } from "next"

import { SiteShell } from "@/components/ironhub/site-shell"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "IronHub | Secure Skills for IronClaw",
    template: "%s | IronHub",
  },
  description:
    "Repo-backed IronClaw skills and Wasm tools with visible vault, sandbox, auth, and endpoint boundaries.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "IronHub | Secure Skills for IronClaw",
    description:
      "Browse repo-backed IronClaw Skills and Tools with security boundaries visible before install.",
    images: ["/assets/iron_claw_guy1.webp"],
  },
  twitter: {
    card: "summary_large_image",
    title: "IronHub | Secure Skills for IronClaw",
    description:
      "Repo-backed skills and Wasm tools for encrypted, sandboxed IronClaw agents.",
    images: ["/assets/iron_claw_guy1.webp"],
  },
  appleWebApp: {
    capable: true,
    title: "IronHub",
    statusBarStyle: "black-translucent",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="font-sans antialiased"
    >
      <body>
        <TooltipProvider>
          <ThemeProvider defaultTheme="light">
            <SiteShell>{children}</SiteShell>
          </ThemeProvider>
        </TooltipProvider>
      </body>
    </html>
  )
}
