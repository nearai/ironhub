/**
 * `text-primary` (#0091fd) only reaches 3.25:1 on the workspace's light
 * surfaces. Light mode therefore uses the existing NEAR cobalt token, which
 * clears 5:1 on every workspace surface; dark mode keeps the brand blue,
 * which already passes there. No new hue.
 */
export const workspaceLinkTone = "text-near-cobalt dark:text-primary"
