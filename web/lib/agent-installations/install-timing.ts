// The two clocks an install runs on. Only one of them is ours to set.
//
// They are easy to confuse because they start at the same instant and are both
// "how long an install has", so they live together here rather than as two
// bare `300`s in two files. The constants are separated by which side owns the
// number, because that is what decides whether changing it does anything.
//
// This module is deliberately free of server imports so the install UI can
// state the deadline from the same constant the signature is built against,
// rather than from a "5 minutes" written into a sentence.

/**
 * How long the *user* has, from starting an install to the agent receiving the
 * delivery.
 *
 * NOT A HUB CHOICE. The agent rejects a delivery whose HMAC-covered `ts` is
 * more than 300 s from its own clock -- `MAX_TIMESTAMP_DRIFT_SECS` in
 * `ironclaw:crates/extensions/ironclaw_extension_manager/src/ironhub/link_service.rs:33`,
 * enforced at `:476` and `:496` (C16). Raising this value hub-side does not
 * widen the window; it produces a delivery the agent refuses as stale, which
 * is strictly worse than a hub-side expiry because the failure then surfaces
 * as an agent error with no mention of a deadline.
 *
 * So this is a ceiling we mirror, not a policy we set. It is also the only one
 * of the two deadlines the user can miss, which is why it is the one the UI
 * states and counts down.
 */
export const INSTALL_CLICK_THROUGH_WINDOW_SECONDS = 300

/**
 * How long the *agent* has to fetch the private manifest and every artifact in
 * it, from the same instant.
 *
 * OURS. Raised from 300 s to 900 s by this change (design.md D8). The two
 * clocks run concurrently rather than consecutively -- the artifact token is
 * minted before the install payload is signed, because the payload covers the
 * manifest URL and the URL embeds the token -- so every second the user spends
 * clicking through is subtracted from the agent's download budget. At 300 s a
 * user who took the full window permitted above handed the agent a token that
 * had already expired.
 *
 * 900 s leaves ~10 minutes of download budget after a worst-case click-through.
 * That matters more than it used to: downloads are sequential with a 30 s
 * timeout each (C17), and publishing schemas and prompts (D1) multiplies the
 * request count by the number of capabilities a tool declares.
 *
 * Not surfaced in the UI. The user takes no action during this window, and a
 * second number on screen would only obscure the one deadline they can miss.
 */
export const ARTIFACT_TOKEN_TTL_SECONDS = 900

/**
 * The click-through window in words, for the two places that state it to a
 * user. Lives beside the constant so the sentence cannot drift from the number
 * it describes -- both call sites previously hardcoded "5 minutes".
 */
export function describeInstallWindow(
  seconds: number = INSTALL_CLICK_THROUGH_WINDOW_SECONDS
): string {
  const minutes = Math.round(seconds / 60)
  return minutes === 1 ? "1 minute" : `${minutes} minutes`
}
