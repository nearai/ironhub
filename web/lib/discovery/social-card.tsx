import { ImageResponse } from "next/og"

export const socialImageSize = {
  width: 1200,
  height: 630,
}

export const socialImageContentType = "image/png"

type SocialCardInput = {
  title: string
  label?: string
  description?: string | null
}

export function renderSocialCard({
  title,
  label = "The Extension Hub for IronClaw",
  description,
}: SocialCardInput) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        color: "#f8fafc",
        background:
          "radial-gradient(circle at 80% 15%, rgba(0, 190, 255, 0.38), transparent 34%), linear-gradient(135deg, #07111f 0%, #111827 58%, #0b2235 100%)",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            width: 54,
            height: 54,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 14,
            background: "#12d3ff",
            color: "#07111f",
            fontSize: 31,
            fontWeight: 800,
          }}
        >
          I
        </div>
        <div
          style={{
            display: "flex",
            marginLeft: 18,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          IronHub
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", maxWidth: 1000 }}>
        <div
          style={{
            display: "flex",
            marginBottom: 18,
            color: "#79e4ff",
            fontSize: 23,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {truncate(label, 60)}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: title.length > 70 ? 48 : 60,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.045em",
          }}
        >
          {truncate(title, 110)}
        </div>
        {description ? (
          <div
            style={{
              display: "flex",
              marginTop: 24,
              maxWidth: 940,
              color: "#cbd5e1",
              fontSize: 25,
              lineHeight: 1.35,
            }}
          >
            {truncate(description, 180)}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          color: "#94a3b8",
          fontSize: 20,
          letterSpacing: "0.03em",
        }}
      >
        hub.ironclaw.com
      </div>
    </div>,
    socialImageSize
  )
}

function truncate(value: string, length: number) {
  const normalized = value.replace(/\s+/g, " ").trim()
  return normalized.length <= length
    ? normalized
    : `${normalized.slice(0, length - 3).trimEnd()}...`
}
