import type { Metadata } from "next"
import { Geist_Mono } from "next/font/google"
import localFont from "next/font/local"

import { SiteShell } from "@/features/shell/components/site-shell"
import { ThemeProvider } from "@/features/shell/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ToastProvider } from "@/features/partner/store/toast-provider"
import { StructuredData } from "@/components/structured-data"
import { buildSiteJsonLd } from "@/lib/discovery/json-ld"
import { siteConfig, siteUrl } from "@/lib/discovery/site"
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
  metadataBase: siteUrl,
  title: {
    default: siteConfig.defaultTitle,
    template: "%s | IronHub",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: "IronHub", url: siteConfig.repository }],
  creator: "IronHub",
  publisher: "IronHub",
  category: "technology",
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
    title: siteConfig.defaultTitle,
    description: siteConfig.description,
    url: "/",
    siteName: siteConfig.name,
    locale: siteConfig.locale,
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: siteConfig.defaultTitle,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.defaultTitle,
    description: siteConfig.description,
    images: ["/opengraph-image"],
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
        <StructuredData id="ironhub-site-jsonld" data={buildSiteJsonLd()} />
        <TooltipProvider>
          <ThemeProvider defaultTheme="light">
            {/* Single provider for the whole tree (design D1): the header's
                notification bell and every workspace screen below it share
                one feedback stack instead of each mounting its own. */}
            <ToastProvider>
              <SiteShell>{children}</SiteShell>
            </ToastProvider>
          </ThemeProvider>
        </TooltipProvider>
      </body>
    </html>
  )
}
