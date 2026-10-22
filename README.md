# Strozpy Limited Marketing Manager

A professional, responsive marketing workspace for **Foxyavenue** (`www.foxyavenue.com`) and **Shapes and Pieces** (`www.shapesandpieces.com`). Built for Vercel with Next.js App Router, React, strict TypeScript, Clerk authentication and PostgreSQL content storage.

## What is implemented

- A light, purple-accented dashboard inspired by the supplied reference, with channel cards, summary tiles, performance charts, upcoming content and quick actions.
- Persistent website selection and separate content records for each website.
- Social content editing, reel storyboard templates and text previews.
- A monthly content calendar with previous/next/today controls. Clicking a date preselects that date in the editor.
- Email campaign subject/body editing and planning.
- Blog draft editing and planning.
- SEO overview, keyword, technical and on-page UI scaffolds.
- Draft creation, editing, filtering, search, reload persistence and CSV content-plan export.
- Protected pages/API, a server-side user allowlist, request validation and database migration.
- Responsive navigation, native accessible editor dialogs, loading/error/empty states and feedback notifications.

**This is a UI and application foundation.** Reel video rendering, social publishing, email sends, subscriber management, real analytics, live SEO audits and CMS publication are not implemented. “Planned” means a calendar record, not an active delivery job. Connections are explicitly shown as unconnected. Production analytics show empty states, not sample numbers.

## Technology

Versions were resolved against npm's stable tags during implementation and pinned in `package.json` and `package-lock.json`. Next.js **16.4.2**, React **19.3.1**, Node.js **24**, compatible TypeScript **5.9.3**, Clerk Next.js **7.9.19**, Recharts, Lucide, Zod and Postgres.js. TypeScript 7 was available but not adopted; the compatible 5.9 line was selected deliberately.

## Local development

```bash
npm ci
cp .env.example .env.local
# Set ENABLE_DEMO=true to explore the separate sample workspace.
npm run dev
```

Open `http://localhost:3000/sign-in`. The optional sample workspace lives at `/demo`. No login credentials are hardcoded. Without auth configuration `/dashboard` redirects to sign-in and private API calls fail closed.

Sample mode uses only browser-local storage under `strozpy:demo:v1:<workspace>`. It never calls the private content API, sends marketing messages or accesses connected accounts. Set `ENABLE_DEMO=false` (the default) to return 404 for all demo routes. Clear those local-storage keys to reset sample content. Workspace preference uses `strozpy:workspace`.

## Vercel deployment

1. Import `mani2939/marketingmanager` in Vercel. Choose the **Next.js** preset, repository root and **Node.js 24.x**. Default install/build/output detection is sufficient; no custom Vercel configuration is needed.
2. Create a Clerk application and enable the required sign-in methods. For an internal tool, disable public sign-up / use invitations. Configure production domain and authorized redirect URLs in Clerk.
3. Set these Vercel environment variables:

| Variable                                          | Purpose                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`               | Clerk application publishable key                                  |
| `CLERK_SECRET_KEY`                                | Server-side Clerk secret                                           |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`                   | `/sign-in`                                                         |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/dashboard`                                                       |
| `STROZPY_ALLOWED_USER_IDS`                        | Comma-separated authorized Clerk user IDs; empty denies all access |
| `DATABASE_URL`                                    | Pooled PostgreSQL connection URL with TLS, e.g. from Neon          |
| `ENABLE_DEMO`                                     | Optional `true`; otherwise omit or set `false`                     |

4. Run the idempotent migration against the chosen database using `npm run db:migrate`. Locally it reads `.env.local`; in CI provide `DATABASE_URL` as a secret. Migrations are deliberately separate from builds to avoid accidental changes from preview deployments.
5. Deploy. Create/invite your own user in Clerk and place its `user_...` ID in `STROZPY_ALLOWED_USER_IDS`, then redeploy. Authorized users can access both brand workspaces.
6. Verify sign-in, rejection of an unauthorized user, save/reload of a draft, brand isolation and sign-out. Configure separate preview and production Clerk apps/databases where appropriate.

Clerk and database accounts were not provisioned during scaffolding. An account connection is required to activate real sign-in and durable storage. If deployment succeeds with missing variables, the UI shows a setup state and private data remains inaccessible.

## Commands

```bash
npm run dev         # Next.js development server
npm run typecheck   # Strict TypeScript checks
npm test            # Content validation and CSV safety tests
npm run build       # Production build
npm start           # Production server after build
npm run db:migrate  # Apply db/001_initial.sql
```

GitHub Actions runs installation, tests, type checking and the production build on pushes and pull requests.

## Design and extension notes

- `components/workspace.tsx` contains the workspace shell and module views; `components/editor.tsx` owns the draft/plan editor; charts are loaded separately.
- `lib/workspaces.ts` is the canonical brand registry.
- `app/api/content/route.ts` reads and upserts authenticated content, always scoped to a validated workspace.
- `db/001_initial.sql` is the initial schema.
- `docs/architecture.md` describes provider contracts, delivery design and next-phase integration work.
- `docs/verification.md` records the checks performed and their limits.
- Typography uses DM Sans / Manrope via Google Fonts CSS, with local system fallbacks; no network fetch is needed during builds.

No website, customer, social or analytics data is imported automatically. Neither website's existing storefront is modified by this project.
