# Strozpy Limited Marketing Manager

A responsive Next.js marketing workspace for **Foxyavenue** (`www.foxyavenue.com`) and **Shapes and Pieces** (`www.shapesandpieces.com`).

## Deployment fix

The reported `STATIC_BUILD_NO_OUT_DIR` error occurred because Vercel expected a static `public` output directory after a successful Next.js build. The repository now pins the deployment configuration in `vercel.json`:

- Framework: `nextjs`
- Install: `npm ci`
- Build: `npm run build`
- Output: `.next`

This overrides the corresponding project settings. Do not change this application to a static export: authentication, API routes and database access require a server runtime. Keep the Vercel project's root directory at the repository root and Node.js at 24.x.

## Administrator login

The temporary internal administrator account is **`StrozpyManager`**. Clerk is no longer required.

Set these variables in Vercel for the environments you deploy:

| Variable                 | Value                                                                   |
| ------------------------ | ----------------------------------------------------------------------- |
| `STROZPY_ADMIN_PASSWORD` | Your chosen strong password, at least 12 characters                     |
| `SESSION_SECRET`         | An independent random secret, at least 32 characters                    |
| `DATABASE_URL`           | Neon pooled URL, normally injected by the Neon integration              |
| `DATABASE_URL_UNPOOLED`  | Optional Neon direct URL for deployment migrations                      |
| `ENABLE_DEMO`            | `false` normally; optional `true` enables the separate sample workspace |

`POSTGRES_URL` / `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING` are supported fallbacks for existing integrations. Do not manually overwrite Neon-managed values. No password or secret is hardcoded, printed in logs or exposed via `NEXT_PUBLIC_` variables.

To change the password, update `STROZPY_ADMIN_PASSWORD` in Vercel and **redeploy**. Changing either the password or `SESSION_SECRET` invalidates older sessions on the new deployment. Old deployment URLs retain their deployment environment until deleted or protected; keep Vercel deployment protection enabled.

Sessions last eight hours and use 256-bit random tokens in HttpOnly, SameSite=Lax cookies (Secure and `__Host-` prefixed in production). Only token hashes are stored in Neon. Sign-out revokes the current session in the database. Login attempts use a database-backed account limit of 10 attempts per 15 minutes, shared across function instances. After a successful login the counter resets. This is a single shared admin account with access to both brands, not individual team accounts or MFA.

If password/secret variables are missing, the app builds but login stays disabled. If Neon is missing or migrations fail on Vercel, deployment fails with a clear initialization error.

## Automatic Neon initialization

`npm run build` runs the migration runner **before** `next build`. Vercel supplies the connected database variables. The runner:

1. Uses a direct Neon URL when available, otherwise the pooled connection.
2. Serializes concurrent initialization with a PostgreSQL transaction advisory lock.
3. Applies pending SQL files from `db/` in order in a transaction.
4. Records migration checksums in `strozpy_schema_migrations`.
5. Leaves existing content intact and skips already-applied migrations.

The migrations create `marketing_content`, `strozpy_sessions`, `strozpy_login_limits` and the migration ledger. Existing `marketing_content` tables from the original scaffold are preserved. The first authenticated/login request also runs the same idempotent initialization as recovery if a deployment bypassed the build command. SQL files are explicitly included in Vercel's traced function bundles.

Use a separate Neon database/branch for preview environments; any configured environment runs its own initialization. Missing databases are skipped only in local development or CI outside Vercel, allowing secret-free build checks. To run manually: `npm run db:migrate`.

## Included modules

- Professional dashboard, website switching, summaries and channel connections.
- Social draft editing, reel storyboard templates and content previews.
- Monthly content planning calendar, with date selection and UTC storage.
- Email campaign editing and Resend Broadcast send/scheduling to brand-specific subscribed segments.
- Blog draft editing and planning.
- SEO overview, keywords, technical and on-page UI scaffolds.
- PostgreSQL draft persistence, search/filter controls and CSV content-plan export.

This remains an application scaffold. Actual video rendering, social publishing, aggregate dashboard analytics, SEO crawling and CMS publication require further integrations. Highlights imports real post metrics from configured social accounts. “Planned” records are calendar entries, not active delivery jobs. Production analytics use empty states until providers are connected.

## Development and verification

```bash
npm ci
cp .env.example .env.local
# Set local credentials and a separate development database, or ENABLE_DEMO=true.
npm run dev
npm test
npm run typecheck
npm run build
```

Open `/sign-in` for real login; `/demo` is optional browser-local sample mode and never accesses private content APIs. Without `ENABLE_DEMO=true`, demo routes return 404. GitHub Actions runs tests, strict TypeScript checks and production compilation.

The stack is Next.js 16.4.2, React 19.3.1, TypeScript 5.9.3, Node.js 24, Postgres.js, Zod and Recharts. Dependencies are pinned. Authentication uses Node's cryptographic randomness and constant-time credential comparison with database-backed opaque sessions.

See `docs/architecture.md` for provider boundaries and `docs/verification.md` for checks and current access limitations.

## Social connections and Highlights

OAuth connections, encrypted Neon token storage and a Highlights module are implemented for Instagram, Facebook Pages, TikTok and YouTube. Configure provider apps and environment variables, then select accounts for each website and refresh their latest five posts. See [the social setup guide](docs/social-connections.md) for exact callbacks, permissions, metrics and limitations. Publishing is still separate integration work.

## Resend email delivery

Email marketing sends or schedules Resend Broadcasts from saved campaigns. Configure `RESEND_API_KEY`, a verified sender and subscribed segment per website, then verify the connection in Settings. The Neon dispatch ledger prevents duplicate sends and records receipts. See [the Resend setup guide](docs/resend-email.md) for exact variable names, consent handling and acceptance checks.
