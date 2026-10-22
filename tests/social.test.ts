import test from "node:test";
import assert from "node:assert/strict";
import { seal, unseal, challenge } from "../lib/social/security";
import {
  latestFive,
  metric,
  safeUrl,
  type SocialPost,
} from "../lib/social/types";
import {
  authorizeUrl,
  exchange,
  fetchPosts,
  refreshCredentials,
  ProviderError,
} from "../lib/social/providers";
process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = "a".repeat(64);
process.env.APP_URL = "https://marketing.example.com";
process.env.GOOGLE_CLIENT_ID = "test-id";
process.env.GOOGLE_CLIENT_SECRET = "test-secret";
process.env.TIKTOK_CLIENT_ID = "test-id";
process.env.TIKTOK_CLIENT_SECRET = "test-secret";
process.env.META_CLIENT_ID = "test-id";
process.env.META_CLIENT_SECRET = "test-secret";
process.env.META_GRAPH_VERSION = "v25.0";
test("tokens are authenticated, randomized and bound to their website/account", () => {
  const token = {
    accessToken: "private-access",
    refreshToken: "private-refresh",
  };
  const a = seal(token, "account:foxyavenue:youtube:123"),
    b = seal(token, "account:foxyavenue:youtube:123");
  assert.notEqual(a, b);
  assert.ok(!a.includes("private-access"));
  assert.deepEqual(unseal(a, "account:foxyavenue:youtube:123"), token);
  assert.throws(() => unseal(a, "account:shapes-and-pieces:youtube:123"));
  const parts = a.split(".");
  parts[3] = (parts[3][0] === "A" ? "B" : "A") + parts[3].slice(1);
  assert.throws(() =>
    unseal(parts.join("."), "account:foxyavenue:youtube:123"),
  );
  assert.throws(() => unseal(a + ".extra", "account:foxyavenue:youtube:123"));
});
test("OAuth targets fixed callbacks, includes state and Google PKCE, never client secrets", () => {
  const url = new URL(authorizeUrl("youtube", "one-time-state", "verifier"));
  assert.equal(
    url.searchParams.get("redirect_uri"),
    "https://marketing.example.com/api/social/callback/youtube",
  );
  assert.equal(url.searchParams.get("state"), "one-time-state");
  assert.equal(url.searchParams.get("code_challenge"), challenge("verifier"));
  assert.equal(url.searchParams.get("access_type"), "offline");
  assert.ok(!url.href.includes("test-secret"));
  assert.equal(
    new URL(authorizeUrl("tiktok", "state", "verifier")).searchParams.get(
      "client_key",
    ),
    "test-id",
  );
  assert.match(
    new URL(authorizeUrl("instagram", "state", "verifier")).searchParams.get(
      "scope",
    ) || "",
    /instagram_manage_insights/,
  );
});
test("latest five are deduplicated and newest-first; unavailable metrics differ from zero", () => {
  const posts = Array.from(
    { length: 8 },
    (_, i) =>
      ({
        id: String(i),
        publishedAt: `2026-10-${String(i + 1).padStart(2, "0")}T12:00:00Z`,
      }) as SocialPost,
  );
  assert.deepEqual(
    latestFive([...posts, posts[7]]).map((p) => p.id),
    ["7", "6", "5", "4", "3"],
  );
  assert.equal(metric(undefined), null);
  assert.equal(metric(0), 0);
  assert.equal(metric("12"), 12);
  assert.equal(metric(-1), null);
  assert.equal(safeUrl("javascript:alert(1)"), null);
  assert.equal(
    safeUrl("https://youtube.com/watch?v=123"),
    "https://youtube.com/watch?v=123",
  );
});
test("TikTok imports metrics and treats API-level failures as errors even with HTTP 200", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      data: {
        videos: [
          {
            id: "1",
            title: "Test",
            create_time: 1700000000,
            view_count: 22,
            like_count: 0,
            comment_count: 2,
            share_count: 3,
          },
        ],
      },
      error: { code: "ok" },
    }),
  );
  const posts = await fetchPosts("tiktok", "id", { accessToken: "token" });
  assert.equal(posts[0].metrics.views, 22);
  assert.equal(posts[0].metrics.likes, 0);
  assert.equal(posts[0].metrics.saves, null);
  mock.mock.mockImplementation(async () =>
    Response.json({
      error: { code: "access_token_invalid", message: "secret provider error" },
    }),
  );
  await assert.rejects(
    () => fetchPosts("tiktok", "id", { accessToken: "token" }),
    (e: unknown) =>
      e instanceof ProviderError &&
      e.reconnect &&
      !e.message.includes("secret"),
  );
});
test("rotating refresh tokens are returned and no refresh occurs before expiry", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      access_token: "new-access",
      refresh_token: "rotated",
      expires_in: 3600,
    }),
  );
  const old = { accessToken: "old", refreshToken: "old-refresh", expiresAt: 0 };
  const next = await refreshCredentials("tiktok", old);
  assert.equal(next.refreshToken, "rotated");
  assert.equal(next.accessToken, "new-access");
  assert.equal(await refreshCredentials("tiktok", next), next);
  assert.equal(mock.mock.callCount(), 1);
  await assert.rejects(
    () => refreshCredentials("youtube", { accessToken: "old", expiresAt: 1 }),
    ProviderError,
  );
});
test("YouTube joins upload IDs with statistics, preserving missing/disabled counts", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      ++calls === 1
        ? { items: [{ contentDetails: { videoId: "v1" } }] }
        : {
            items: [
              {
                id: "v1",
                snippet: {
                  title: "Video",
                  publishedAt: "2026-10-21T00:00:00Z",
                  thumbnails: {},
                },
                statistics: { viewCount: "10" },
              },
            ],
          },
    ),
  );
  const [p] = await fetchPosts("youtube", "channel", {
    accessToken: "t",
    uploadsPlaylist: "uploads",
  });
  assert.equal(p.metrics.views, 10);
  assert.equal(p.metrics.likes, null);
  assert.equal(p.url, "https://www.youtube.com/watch?v=v1");
});
test("Instagram keeps base post counts when optional insights are unavailable", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () =>
    ++calls === 1
      ? Response.json({
          data: [
            {
              id: "m1",
              caption: "Post",
              timestamp: "2026-10-20T00:00:00Z",
              media_type: "IMAGE",
              like_count: 0,
              comments_count: 4,
            },
          ],
        })
      : Response.json(
          { error: { code: 100, message: "metric unavailable" } },
          { status: 400 },
        ),
  );
  const [p] = await fetchPosts("instagram", "ig", { accessToken: "token" });
  assert.equal(p.metrics.likes, 0);
  assert.equal(p.metrics.comments, 4);
  assert.equal(p.metrics.views, null);
  assert.ok(p.warning);
});
test("Meta only offers eligible linked Instagram accounts, retaining page tokens server-side", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      ++calls === 1
        ? { access_token: "short" }
        : calls === 2
          ? { access_token: "long" }
          : {
              data: [
                {
                  id: "p1",
                  name: "Page 1",
                  access_token: "page-token",
                  instagram_business_account: { id: "ig1", username: "brand" },
                },
                { id: "p2", name: "Page 2", access_token: "other" },
              ],
            },
    ),
  );
  const candidates = await exchange("instagram", "code", "");
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].accountId, "ig1");
  assert.equal(candidates[0].credentials.accessToken, "page-token");
});
