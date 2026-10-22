# Architecture and integration roadmap

## Current flow

The Next.js server validates the Clerk session and checks `STROZPY_ALLOWED_USER_IDS` before rendering `/dashboard/*` or responding to `/api/content`. Authorized users share access to the two workspaces. This is an internal-team model, not multi-tenant SaaS authorization.

The client selects a website, fetches `/api/content?workspace=<id>`, opens an editor, validates with Zod, and POSTs the record. The server checks origin, body size, schema, workspace and channel/type compatibility, then performs a parameterized PostgreSQL upsert. Updates cannot move a record to another workspace or change its type. A failed save leaves the editor open. No provider credentials are sent to the browser.

Clerk owns login, password/session management and identity verification. The application's allowlist owns authorization. Empty auth configuration or an empty allowlist denies private access. The optional demo is a separate route with browser-only sample state and is off by default.

## Stored content

`marketing_content`: UUID, workspace, kind (`post`, `reel`, `email`, `blog`), title, body, channel, status (`draft`, `planned`), planned timestamp in UTC, update timestamp and creating Clerk user ID. Local date inputs are converted to UTC and presented back in the browser's local time zone. Existing past planned records remain visible but must be assigned a future date when replanned.

List responses are capped at 1,000 records; add cursor pagination before exceeding this. Last-write-wins editing is sufficient for the scaffold; add a revision column and conditional writes before collaborative editing. Draft deletion, file upload, rich text and version history are intentionally future work.

## Provider boundaries

See `lib/providers.ts` for contracts. They describe integrations, not working provider implementations.

| Capability         | Required next work                                                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Instagram/Facebook | Meta OAuth, permission review, account mapping per website, media upload, publish status and webhooks                                                          |
| TikTok             | OAuth, approved Content Posting API permissions, upload/publish polling and policy checks                                                                      |
| Reel generation    | Input image upload to object storage, selected video provider, asynchronous render job, progress polling and media preview                                     |
| Email              | Sender/domain verification, subscriber/consent tables, suppression list, unsubscribe tokens, campaign recipient snapshot, delivery provider and event webhooks |
| SEO                | Search Console OAuth/property mapping, GA4 mapping, crawler jobs restricted to verified website origins, robots/sitemap handling and snapshots                 |
| Blogs              | Shopify/CMS credentials, destination mapping, content sanitization, draft preview and publish approval                                                         |

Connections should be per website. Encrypt refresh tokens using managed keys, never store them in public environment variables or local storage. Validate OAuth state, verify webhook signatures and implement token refresh/revocation.

## Actual delivery scheduling

The existing calendar is a plan, with no delivery worker or cron configured. Do not rename `planned` to `scheduled` until a real delivery path exists.

For implementation, add delivery jobs with destination, due UTC timestamp, idempotency key, attempts, last error and provider receipt. After a user confirms scheduling, enqueue a durable workflow or a database-backed dispatcher. Claim due rows transactionally (`FOR UPDATE SKIP LOCKED`), publish through the selected provider, record receipts and retry transient errors with backoff. At-least-once execution requires provider-level or application idempotency. Cap retries and expose manual recovery. A provider accepting a message is distinct from delivery; update final outcomes via signed webhooks.

Use a protected scheduler endpoint, validate the scheduler's server secret, and never expose it through the client. Validate plan frequency against the chosen Vercel tier. Keep long video renders outside the request lifecycle.

## Production hardening for the next phase

Add durable audit logs, shared rate limiting for write/publish actions, optimistic concurrency, automated retention, structured server error logs with safe request IDs, database backups, key rotation and monitoring. Add integration tests against a disposable real PostgreSQL database and a Clerk test instance. Evolve the static allowlist into workspace membership/roles if access should differ by website.
