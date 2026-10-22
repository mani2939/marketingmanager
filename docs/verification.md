# Verification

## Implemented user story

An authorized team member signs in, selects a brand, creates a content draft, assigns an optional future date, saves it through the private API and sees it in that brand's content plan. Sample mode provides a separate browser-local demonstration.

## Checks performed

- `npm test`: 23 tests passed, covering administrator credential validation, password/secret rotation, session tokens, origin checks, Vercel output configuration, database URL aliases, repeatable SQL migrations that preserve existing content, and valid drafts, unknown workspaces, future planned dates, unsupported publication states, channel/type validation, title/body limits and CSV formula/quote safety.
- `npm run build`: successful optimized Next.js 16.4.2 production build including TypeScript checking and every application/API route.
- Desktop preview: server-rendered dashboard, reference-inspired visual hierarchy, workspace selector, navigation and summary cards were visually inspected. Secondary text contrast was increased after inspection.
- Client runtime: the managed preview showed the dashboard but did not initialize interactive controls under the initial development server. A documented Webpack development fallback was added; subsequent browser verification was blocked by preview/browser access errors. Editor interaction, chart hydration, responsive behavior and browser-local persistence are therefore **not browser-verified** in this environment.
- Code review: production routes and API repeat server-side authentication and authorization; the optional demo is separate and cannot write private content. The server rejects unknown workspaces and cross-workspace/type upserts; mutations validate origin and schema.

## Not verified against external accounts

Live Vercel team access returns 403 for both connected accounts. Administrator environment variables could not be created and no live Neon credentials are available locally. SQL migrations were executed twice against embedded PostgreSQL (PGlite) with existing content preservation verified; live Neon migration and browser sign-in/sign-out remain unverified. GitHub-triggered deployment status is checked separately after pushing. Social account reading and Highlights adapters are implemented and tested with mocked provider responses; live consent and provider access are unverified. Delivery workers remain out of scope.

## Deployment acceptance checks

1. With `ENABLE_DEMO=false`, ensure `/demo` returns 404.
2. Sign out; ensure `/dashboard` redirects to `/sign-in` and private API calls are rejected.
3. Try incorrect credentials; ensure access is denied. Verify repeated failures are rate limited.
4. Sign in as `StrozpyManager` using the configured password; create a draft and reload to confirm PostgreSQL persistence.
5. Switch websites; ensure content stays within its workspace, then switch back.
6. Edit a draft; plan it for a future date and verify the calendar date in your local time zone.
7. Confirm past dates and empty titles cannot be planned/saved.
8. Check desktop and mobile navigation, editor focus/escape behavior, and sign-out and password rotation after redeployment.
9. Configure a provider app, connect an account to the selected website, confirm account selection and inspect the first import in Highlights. Reload to check persistence.
10. Switch brands and confirm the connection and posts are isolated. Reconnect/refresh and test denial, expired consent, unavailable metrics and an empty account.
11. Disconnect and confirm local credentials and cached posts disappear. No planned content should be sent automatically.

## Social update checks

- Production build and TypeScript checks passed with all new API routes.
- Tests cover authenticated encryption, ciphertext tampering and website binding, OAuth URL/PKCE construction, latest-five sorting/deduplication, unavailable versus zero counts, TikTok API-level errors and token rotation, YouTube statistics, Instagram partial insights and Meta eligible account discovery.
- Embedded PostgreSQL tests cover the new migration, cross-website account identity, scoped deletion and cascade, session-bound single-use/expired OAuth state, and rollback preservation of cached posts.
- Social UI browser inspection was blocked by the managed browser security policy. No live provider credentials were available. Provider approval, live consent, production account selection and actual analytics still require acceptance checks above.
