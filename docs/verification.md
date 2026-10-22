# Verification

## Implemented user story

An authorized team member signs in, selects a brand, creates a content draft, assigns an optional future date, saves it through the private API and sees it in that brand's content plan. Sample mode provides a separate browser-local demonstration.

## Checks performed

- `npm test`: six tests passed, covering valid drafts, unknown workspaces, future planned dates, unsupported publication states, channel/type validation, title/body limits and CSV formula/quote safety.
- `npm run build`: successful optimized Next.js 16.4.2 production build including TypeScript checking and every application/API route.
- Desktop preview: server-rendered dashboard, reference-inspired visual hierarchy, workspace selector, navigation and summary cards were visually inspected. Secondary text contrast was increased after inspection.
- Client runtime: the managed preview showed the dashboard but did not initialize interactive controls under the initial development server. A documented Webpack development fallback was added; subsequent browser verification was blocked by preview/browser access errors. Editor interaction, chart hydration, responsive behavior and browser-local persistence are therefore **not browser-verified** in this environment.
- Code review: production routes and API repeat server-side authentication and authorization; the optional demo is separate and cannot write private content. The server rejects unknown workspaces and cross-workspace/type upserts; mutations validate origin and schema.

## Not verified against external accounts

No Clerk keys, authorized user IDs, database credentials, social tokens, CMS credentials or analytics properties were provided/provisioned. Live sign-in/sign-out, database migration/round-trip, provider delivery and Vercel deployment have not been executed. Provider integrations and delivery workers are explicitly out of the implemented scaffold.

## Deployment acceptance checks

1. With `ENABLE_DEMO=false`, ensure `/demo` returns 404.
2. Sign out; ensure `/dashboard` redirects to `/sign-in` and private API calls are rejected.
3. Sign in as an account not in the allowlist; ensure workspace access is denied.
4. Sign in as an authorized account; create a draft and reload to confirm PostgreSQL persistence.
5. Switch websites; ensure content stays within its workspace, then switch back.
6. Edit a draft; plan it for a future date and verify the calendar date in your local time zone.
7. Confirm past dates and empty titles cannot be planned/saved.
8. Check desktop and mobile navigation, editor focus/escape behavior, and any configured Clerk account controls.
9. Confirm all provider cards remain unconnected until real integrations exist and no planned content is sent automatically.
