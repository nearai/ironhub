import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  return React.useSyncExternalStore(subscribeToMobile, getMobileSnapshot, getServerSnapshot)
}

function subscribeToMobile(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

function getMobileSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

function getServerSnapshot() {
  return false
}
