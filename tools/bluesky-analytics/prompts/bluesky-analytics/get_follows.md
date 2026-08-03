# Bluesky Analytics: get_follows

Run the legacy get follows operation. See the prompt and input schema for its exact contract.

Legacy tool context: Read-only Bluesky (AT Protocol) analytics. Browse public accounts and engagement via the unauthenticated AppView 'public.api.bsky.app'. Actions: 'get_profile' (follower/follows/post counts + bio), 'get_author_feed' (an account's posts with like/repost/reply/quote counts), 'get_post_thread' (a post and its reply/comment tree), 'get_followers' and 'get_follows' (social graph), 'get_likes' and 'get_reposted_by' (who engaged with a post), 'search_actors' (find accounts by keyword). All data is public; no authentication, secret, or login is required. Posting, replying, liking and other writes are NOT supported (they require an authenticated session, which a stateless WASM tool cannot perform).

## Inputs

- `actor` (required): Account identifier: a handle (e.g. 'alice.bsky.social') or DID (e.g. 'did:plc:...').
- `limit` (optional): Max results (1-100, default 50).
- `cursor` (optional): Opaque pagination cursor from a previous response. Pass it back to fetch the next page.

The operation is selected by IronClaw as `bluesky-analytics.get_follows`. Do not send the private `action` selector.
