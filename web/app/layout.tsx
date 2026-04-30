import type { Metadata } from "next"

import { SiteShell } from "@/components/ironhub/site-shell"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

export const metadata: Metadata = {
  title: "IronHub",
  description: "Repo-backed skills and tools marketplace for IronClaw.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark font-sans antialiased">
      <body>
        <TooltipProvider>
          <ThemeProvider defaultTheme="dark">
            <SiteShell>{children}</SiteShell>
          </ThemeProvider>
        </TooltipProvider>
      </body>
    </html>
  )
}
