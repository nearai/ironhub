"use client"

import * as React from "react"

export interface RelativeTimeProps {
  value: string | Date
  className?: string
  prefix?: string
}

function subscribeMounted() {
  return () => {}
}

function getMountedSnapshot() {
  return true
}

function getServerMountedSnapshot() {
  return false
}

function formatRelativeTime(date: Date): string {
  const now = Date.now()
  const diffInSeconds = Math.round((date.getTime() - now) / 1000)
  const absSec = Math.abs(diffInSeconds)

  if (absSec < 45) {
    return "just now"
  }

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

  if (absSec < 3600) {
    const minutes = Math.round(diffInSeconds / 60)
    return rtf.format(minutes, "minute")
  }
  if (absSec < 86400) {
    const hours = Math.round(diffInSeconds / 3600)
    return rtf.format(hours, "hour")
  }
  if (absSec < 7 * 86400) {
    const days = Math.round(diffInSeconds / 86400)
    return rtf.format(days, "day")
  }
  if (absSec < 30 * 86400) {
    const weeks = Math.round(diffInSeconds / (7 * 86400))
    return rtf.format(weeks, "week")
  }
  if (absSec < 365 * 86400) {
    const months = Math.round(diffInSeconds / (30 * 86400))
    return rtf.format(months, "month")
  }
  const years = Math.round(diffInSeconds / (365 * 86400))
  return rtf.format(years, "year")
}

export function RelativeTime({ value, className, prefix }: RelativeTimeProps) {
  const mounted = React.useSyncExternalStore(
    subscribeMounted,
    getMountedSnapshot,
    getServerMountedSnapshot
  )

  const date = React.useMemo(() => {
    if (value instanceof Date) return value
    if (typeof value === "string") return new Date(value)
    return new Date(NaN)
  }, [value])

  if (isNaN(date.getTime())) {
    return <time className={className}>—</time>
  }

  const iso = date.toISOString()
  const title = date.toLocaleString()
  const fallback = iso.slice(0, 10)
  const displayed = mounted ? formatRelativeTime(date) : fallback
  const content = prefix ? `${prefix} ${displayed}` : displayed

  return (
    <time
      dateTime={iso}
      title={mounted ? title : undefined}
      className={className}
    >
      {content}
    </time>
  )
}
