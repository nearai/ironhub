import type { Metadata } from "next"
import { Geist_Mono } from "next/font/google"
import localFont from "next/font/local"

import { SiteShell } from "@/features/shell/components/site-shell"
import { ThemeProvider } from "@/features/shell/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

// FK Grotesk — NEAR brand primary typeface. Hierarchy built from weight.
const fkGrotesk = localFont({
  variable: "--font-sans-fk",
  display: "swap",
  src: [
    { path: "./fonts/FKGrotesk-Thin.otf", weight: "100", style: "normal" },
    { path: "./fonts/FKGrotesk-Light.otf", weight: "300", style: "normal" },
    { path: "./fonts/FKGrotesk-Regular.otf", weight: "400", style: "normal" },
    {
      path: "./fonts/FKGrotesk-RegularItalic.otf",
      weight: "400",
      style: "italic",
    },
    { path: "./fonts/FKGrotesk-Medium.otf", weight: "500", style: "normal" },
    { path: "./fonts/FKGrotesk-Bold.otf", weight: "700", style: "normal" },
    { path: "./fonts/FKGrotesk-Black.otf", weight: "900", style: "normal" },
  ],
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono-geist",
  display: "swap",
})

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
      className={`${fkGrotesk.variable} ${geistMono.variable} font-sans antialiased`}
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
