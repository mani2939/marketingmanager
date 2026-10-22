# Social connections and Highlights

## What this implements

Authenticated OAuth connections for Facebook Pages, linked Instagram professional accounts, TikTok and YouTube. Every connection belongs to the selected website. After authorization, explicitly select one account for that website; repeat Connect to add more. Tokens never reach the browser and are AES-256-GCM encrypted in Neon with workspace/provider/account binding. OAuth attempts are single-use, expire after ten minutes and are bound to the initiating administrator session. Google also uses PKCE.

Highlights shows the latest five accessible published posts **per account**, with thumbnails, original links, dates and lifetime metrics. Refresh imports data and persists the snapshot. The first import runs after account selection. Subsequent refreshes are manual. A failed import preserves the previous snapshot and displays its timestamp and error. Concurrent refreshes are locked and successful refreshes have a one-minute cooldown. Missing metrics display a dash; actual zero counts display zero. No invented engagement rates or cross-platform comparisons are shown. Facebook's reaction count is labelled Reactions.

| Platform  | Eligible accounts                                             | Metrics                                                                     |
| --------- | ------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Instagram | Business/Creator account linked to a Facebook Page you manage | Likes, comments; views, reach, saves and shares when insights are available |
| Facebook  | Pages you manage, not personal profiles                       | Reactions, comments and shares when returned                                |
| TikTok    | Authorized account with approved Display API access           | Video views, likes, comments and shares                                     |
| YouTube   | Authorized channel                                            | Views, likes and comments when returned                                     |

These permissions support account reading and Highlights. Publishing, scheduled delivery and video creation remain separate implementation work. The existing dashboard's broad reach/engagement summary is still an unconnected placeholder; use Highlights for real post data. Email, SEO and CMS connection cards are unchanged. X, LinkedIn and Pinterest are not included in this release.

## Vercel setup

1. Set `APP_URL` to your stable HTTPS app origin, for example `https://your-app.vercel.app`. This must match the domain you use to sign in and start connections. Do not use a changing preview URL.
2. Generate a new independent key using `openssl rand -hex 32` and save it as `SOCIAL_TOKEN_ENCRYPTION_KEY`. Keep this stable and private. Do not reuse `SESSION_SECRET`; session rotation should not destroy token access. A key change requires reconnecting saved accounts.
3. Add the provider credentials below only for platforms you intend to connect. Values are server-only, never `NEXT_PUBLIC_`.
4. Redeploy. The build runs `003_social_accounts.sql` automatically, preserving existing content and sessions.
5. Sign in, choose the website, open Settings, Connect, approve provider consent and choose the correct account. Open Highlights to see the first import; use Refresh for updated counts.

Use separate provider apps, secrets and databases for preview environments when possible. Missing provider secrets disable only that provider's Connect button and display the missing configuration.

### Meta: Instagram and Facebook

Create/configure a Meta app with Facebook Login appropriate for your business use case. Set `META_CLIENT_ID`, `META_CLIENT_SECRET`, and `META_GRAPH_VERSION` to the supported API version selected in the app dashboard. Register both exact redirect URLs:

- `APP_URL/api/social/callback/instagram`
- `APP_URL/api/social/callback/facebook`

Here and below, replace `APP_URL` with your actual origin; it is not a literal hostname.

Facebook requests `pages_show_list,pages_read_engagement`. Instagram additionally requests `instagram_basic,instagram_manage_insights`. Connect Instagram through Facebook authorization: this implementation requires a linked professional Instagram account. Select the Pages you want to grant access to during consent, then select the account for the current website in Strozpy. The account discovery flow reads up to 1,000 granted Pages. No eligible Page/Instagram account produces a clear connection-failed notice.

Development apps work only with eligible app-role/test accounts. Access for other users can require business verification and App Review/advanced access. Obtain permissions in the developer dashboard before going live. A long-lived user token is exchanged server-side and used to obtain Page tokens; revoked/invalid tokens require reconnection. Instagram insights availability varies with media type, age and permissions; failures do not hide otherwise accessible posts.

### TikTok

Set `TIKTOK_CLIENT_ID` to your app's **client key** and set `TIKTOK_CLIENT_SECRET`. Configure Login Kit for Web and Display API with `user.info.basic,video.list`. Register `APP_URL/api/social/callback/tiktok`. Production use may require app review; use the approved sandbox/test account path during development. The Display API covers accessible public video posts, not unpublished drafts or every TikTok content format.

### YouTube

Enable YouTube Data API v3 in Google Cloud. Configure an OAuth consent screen and a Web application OAuth client. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Register `APP_URL/api/social/callback/youtube`. The permission is `https://www.googleapis.com/auth/youtube.readonly`. Add your Google account as a test user while the app is in Testing. Testing-mode refresh tokens can expire; complete the appropriate production/verification setup for durable use. Strozpy requests offline access and refreshes tokens before import when necessary.

## Operations and security

- APIs require the existing administrator session; mutation endpoints also require a matching Origin. Account reads and writes are explicitly website-scoped.
- OAuth flow rows and encrypted pending account selections expire after ten minutes; expired rows are cleaned up when starting the next connection. Credentials are never returned by list, pending-selection or Highlights endpoints.
- Google/TikTok refresh tokens are renewed on import when needed. Rotated credentials are saved before fetching posts so a transient metrics failure does not discard a new token.
- Disconnect deletes the local encrypted credentials and cached posts for that website. It does **not** revoke the provider-wide grant, which may also serve the other website. To revoke access completely, use the platform's connected-app settings; reconnect other affected accounts afterward.
- Provider errors are sanitized; no raw provider payloads, token-bearing URLs or driver errors are logged. Quota failures are visible and are not retried in a tight loop.
- Access to both websites still uses the shared `StrozpyManager` login. Individual user permissions are outside this release.
- No cron or unattended social publishing was introduced. Refresh is an explicit authenticated read operation.

## API and extension points

- `POST /api/social/connect?workspace=…&provider=…`: begin OAuth.
- `GET /api/social/callback/{provider}`: validate state, exchange code, save encrypted temporary candidates.
- `GET/POST /api/social/pending?workspace=…&id=…[&index=…]`: list sanitized candidates / persist selection.
- `GET/DELETE /api/social/accounts?workspace=…[&id=…]`: list / remove local connections.
- `POST /api/social/sync?workspace=…&id=…`: refresh one account and its latest posts.
- `GET /api/social/highlights?workspace=…`: saved latest-five snapshots.

Provider adapters live in `lib/social/providers.ts`; server-only persistence and refresh orchestration live in `lib/social/server.ts`. Future publishing integrations must retrieve/decrypt tokens on the server, verify stored scopes and request additional provider-approved publishing permissions. Do not expose raw credentials to client code.

## Provider references

- https://developers.facebook.com/documentation/pages-api
- https://developers.facebook.com/documentation/instagram-platform/overview
- https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived/
- https://developers.tiktok.com/docs/en/login-kit-web
- https://developers.tiktok.com/docs/en/oauth-user-access-token-management
- https://developers.tiktok.com/docs/en/tiktok-api-v2-video-list
- https://developers.google.com/identity/protocols/oauth2/web-server
- https://developers.google.com/youtube/data/docs

Live OAuth consent, account access and API quotas must be verified with your approved provider apps. Mock-provider tests cannot establish production approval or access.
