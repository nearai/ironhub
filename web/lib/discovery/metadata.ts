import type { Metadata } from "next"

import { absoluteUrl, siteConfig } from "./site.ts"

type PublicMetadataInput = {
  title: string
  description: string
  path: string
  markdownPath?: string
  imagePath?: string
  imageAlt?: string
  type?: "website" | "article"
  absoluteTitle?: boolean
}

export function buildPublicMetadata({
  title,
  description,
  path,
  markdownPath,
  imagePath = "/opengraph-image",
  imageAlt = `${title} social preview`,
  type = "website",
  absoluteTitle = false,
}: PublicMetadataInput): Metadata {
  const canonical = absoluteUrl(path)
  const image = absoluteUrl(imagePath)

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical,
      ...(markdownPath
        ? { types: { "text/markdown": absoluteUrl(markdownPath) } }
        : {}),
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: image, alt: imageAlt }],
    },
  }
}

export function buildPrivateMetadata(title: string): Metadata {
  return {
    title,
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  }
}

export function summarizeDescription(value: string | null | undefined) {
  const normalized = (value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (normalized.length <= 180) return normalized
  return `${normalized.slice(0, 177).trimEnd()}...`
}
