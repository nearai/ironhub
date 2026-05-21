"use client"

import * as React from "react"
import { useTheme } from "next-themes"

function useThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = React.useSyncExternalStore(
    subscribeMounted,
    getMountedSnapshot,
    getServerMountedSnapshot
  )

  const isDark = mounted ? resolvedTheme !== "light" : true
  const nextTheme = isDark ? "light" : "dark"

  const toggleTheme = React.useCallback(() => {
    setTheme(nextTheme)
  }, [nextTheme, setTheme])

  return {
    isDark,
    mounted,
    nextTheme,
    toggleTheme,
  }
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

export { useThemeToggle }
