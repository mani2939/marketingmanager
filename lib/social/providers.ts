import "server-only";
import { providerConfig } from "./config";
import { challenge } from "./security";
import {
  latestFive,
  metric,
  safeUrl,
  type Candidate,
  type Credentials,
  type SocialPost,
  type SocialProvider,
} from "./types";
// Provider payloads differ. Validate security-critical fields and normalize output before persistence.
type Payload = Record<string, any>;
export class ProviderError extends Error {
  constructor(public reconnect = false) {
    super(
      reconnect
        ? "Authorization expired or was revoked. Reconnect this account."
        : "The platform request failed or is rate limited. Try refreshing again later.",
    );
  }
}
async function json(url: string, init: RequestInit = {}): Promise<Payload> {
  const r = await fetch(url, {
    ...init,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  let data: Payload;
  try {
    data = await r.json();
  } catch {
    throw new ProviderError();
  }
  if (!r.ok || (data.error && data.error.code !== "ok")) {
    const code = data.error?.code || data.error;
    throw new ProviderError(
      r.status === 401 ||
        code === 190 ||
        code === "invalid_grant" ||
        code === "access_token_invalid",
    );
  }
  return data;
}
const query = (base: string, params: Record<string, string>) =>
  `${base}?${new URLSearchParams(params)}`;
const form = (params: Record<string, string>): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams(params),
});
const bearer = (token: string): RequestInit => ({
  headers: { Authorization: `Bearer ${token}` },
});
const graph = (path: string) =>
  `https://graph.facebook.com/${process.env.META_GRAPH_VERSION}/${path}`;
function creds(data: Payload, previous?: Credentials): Credentials {
  if (typeof data.access_token !== "string" || !data.access_token)
    throw new ProviderError();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || previous?.refreshToken,
    expiresAt: data.expires_in
      ? Date.now() + Number(data.expires_in) * 1000
      : previous?.expiresAt,
    scopes: data.scope || previous?.scopes,
    uploadsPlaylist: previous?.uploadsPlaylist,
  };
}
export function authorizeUrl(
  provider: SocialProvider,
  state: string,
  verifier: string,
) {
  const c = providerConfig(provider),
    params = {
      client_id: c.clientId,
      redirect_uri: c.callback,
      response_type: "code",
      state,
    };
  if (provider === "youtube")
    return query("https://accounts.google.com/o/oauth2/v2/auth", {
      ...params,
      scope: "https://www.googleapis.com/auth/youtube.readonly",
      access_type: "offline",
      prompt: "consent",
      code_challenge: challenge(verifier),
      code_challenge_method: "S256",
    });
  if (provider === "tiktok")
    return query("https://www.tiktok.com/v2/auth/authorize/", {
      client_key: c.clientId,
      redirect_uri: c.callback,
      response_type: "code",
      state,
      scope: "user.info.basic,video.list",
    });
  return query(`https://www.facebook.com/${c.version}/dialog/oauth`, {
    ...params,
    scope:
      provider === "instagram"
        ? "pages_show_list,pages_read_engagement,instagram_basic,instagram_manage_insights"
        : "pages_show_list,pages_read_engagement",
    auth_type: "rerequest",
  });
}
export async function exchange(
  provider: SocialProvider,
  code: string,
  verifier: string,
): Promise<Candidate[]> {
  const c = providerConfig(provider);
  if (provider === "youtube") {
    const token = creds(
      await json(
        "https://oauth2.googleapis.com/token",
        form({
          client_id: c.clientId,
          client_secret: c.secret,
          code,
          redirect_uri: c.callback,
          grant_type: "authorization_code",
          code_verifier: verifier,
        }),
      ),
    );
    const channels = await json(
      query("https://www.googleapis.com/youtube/v3/channels", {
        part: "snippet,contentDetails",
        mine: "true",
        maxResults: "50",
      }),
      bearer(token.accessToken),
    );
    return (channels.items || []).map((a: Payload) => ({
      accountId: a.id,
      name: a.snippet.title,
      provider,
      credentials: {
        ...token,
        uploadsPlaylist: a.contentDetails.relatedPlaylists.uploads,
      },
    }));
  }
  if (provider === "tiktok") {
    const data = await json(
      "https://open.tiktokapis.com/v2/oauth/token/",
      form({
        client_key: c.clientId,
        client_secret: c.secret,
        code,
        redirect_uri: c.callback,
        grant_type: "authorization_code",
      }),
    );
    const token = creds(data),
      info = await json(
        query("https://open.tiktokapis.com/v2/user/info/", {
          fields: "open_id,display_name",
        }),
        bearer(token.accessToken),
      );
    if (!info.data?.user?.open_id) throw new ProviderError();
    return [
      {
        accountId: info.data.user.open_id,
        name: info.data.user.display_name,
        provider,
        credentials: token,
      },
    ];
  }
  const short = await json(
    query(graph("oauth/access_token"), {
      client_id: c.clientId,
      client_secret: c.secret,
      redirect_uri: c.callback,
      code,
    }),
  );
  const long = await json(
    query(graph("oauth/access_token"), {
      grant_type: "fb_exchange_token",
      client_id: c.clientId,
      client_secret: c.secret,
      fb_exchange_token: short.access_token,
    }),
  );
  const candidates: Candidate[] = [];
  let after = "";
  for (let page = 0; page < 10; page++) {
    const list = await json(
      query(graph("me/accounts"), {
        fields: "id,name,access_token,instagram_business_account{id,username}",
        limit: "100",
        ...(after ? { after } : {}),
      }),
      bearer(long.access_token),
    );
    for (const a of list.data || []) {
      if (provider === "instagram" && !a.instagram_business_account) continue;
      if (typeof a.access_token !== "string") continue;
      candidates.push({
        accountId:
          provider === "instagram" ? a.instagram_business_account.id : a.id,
        name:
          provider === "instagram"
            ? a.instagram_business_account.username
            : a.name,
        provider,
        credentials: {
          accessToken: a.access_token,
          scopes:
            provider === "instagram"
              ? "pages_show_list,pages_read_engagement,instagram_basic,instagram_manage_insights"
              : "pages_show_list,pages_read_engagement",
        },
      });
    }
    if (!list.paging?.next) break;
    after = list.paging?.cursors?.after;
    if (!after) break;
  }
  return candidates;
}
export async function refreshCredentials(
  provider: SocialProvider,
  old: Credentials,
) {
  if (old.expiresAt == null || old.expiresAt > Date.now() + 300000) return old;
  if (!old.refreshToken) throw new ProviderError(true);
  const c = providerConfig(provider);
  if (provider === "youtube")
    return creds(
      await json(
        "https://oauth2.googleapis.com/token",
        form({
          client_id: c.clientId,
          client_secret: c.secret,
          grant_type: "refresh_token",
          refresh_token: old.refreshToken,
        }),
      ),
      old,
    );
  if (provider === "tiktok")
    return creds(
      await json(
        "https://open.tiktokapis.com/v2/oauth/token/",
        form({
          client_key: c.clientId,
          client_secret: c.secret,
          grant_type: "refresh_token",
          refresh_token: old.refreshToken,
        }),
      ),
      old,
    );
  throw new ProviderError(true);
}
export async function fetchPosts(
  provider: SocialProvider,
  accountId: string,
  token: Credentials,
): Promise<SocialPost[]> {
  const auth = bearer(token.accessToken),
    empty = {
      views: null,
      reach: null,
      likes: null,
      comments: null,
      shares: null,
      saves: null,
    };
  if (provider === "youtube") {
    if (!token.uploadsPlaylist) throw new ProviderError(true);
    const list = await json(
      query("https://www.googleapis.com/youtube/v3/playlistItems", {
        part: "contentDetails",
        playlistId: token.uploadsPlaylist,
        maxResults: "5",
      }),
      auth,
    );
    const ids = (list.items || [])
      .map((x: Payload) => x.contentDetails.videoId)
      .join(",");
    if (!ids) return [];
    const data = await json(
      query("https://www.googleapis.com/youtube/v3/videos", {
        part: "snippet,statistics",
        id: ids,
      }),
      auth,
    );
    return latestFive(
      (data.items || []).map((x: Payload) => ({
        id: x.id,
        title: x.snippet.title,
        url: `https://www.youtube.com/watch?v=${encodeURIComponent(x.id)}`,
        thumbnail: safeUrl(x.snippet.thumbnails?.medium?.url),
        publishedAt: x.snippet.publishedAt,
        metrics: {
          ...empty,
          views: metric(x.statistics?.viewCount),
          likes: metric(x.statistics?.likeCount),
          comments: metric(x.statistics?.commentCount),
        },
      })),
    );
  }
  if (provider === "tiktok") {
    const data = await json(
      query("https://open.tiktokapis.com/v2/video/list/", {
        fields:
          "id,title,video_description,create_time,cover_image_url,share_url,view_count,like_count,comment_count,share_count",
      }),
      {
        method: "POST",
        headers: { ...auth.headers, "Content-Type": "application/json" },
        body: JSON.stringify({ max_count: 5 }),
      },
    );
    return latestFive(
      (data.data?.videos || []).map((x: Payload) => ({
        id: x.id,
        title: x.title || x.video_description || "TikTok video",
        url: safeUrl(x.share_url),
        thumbnail: safeUrl(x.cover_image_url),
        publishedAt: new Date(x.create_time * 1000).toISOString(),
        metrics: {
          ...empty,
          views: metric(x.view_count),
          likes: metric(x.like_count),
          comments: metric(x.comment_count),
          shares: metric(x.share_count),
        },
      })),
    );
  }
  if (provider === "facebook") {
    const data = await json(
      query(graph(`${encodeURIComponent(accountId)}/published_posts`), {
        fields:
          "id,message,created_time,permalink_url,full_picture,reactions.limit(0).summary(true),comments.limit(0).summary(true),shares",
        limit: "5",
      }),
      auth,
    );
    return latestFive(
      (data.data || []).map((x: Payload) => ({
        id: x.id,
        title: x.message || "Facebook post",
        url: safeUrl(x.permalink_url),
        thumbnail: safeUrl(x.full_picture),
        publishedAt: x.created_time,
        metrics: {
          ...empty,
          likes: metric(x.reactions?.summary?.total_count),
          comments: metric(x.comments?.summary?.total_count),
          shares: metric(x.shares?.count),
        },
      })),
    );
  }
  const data = await json(
    query(graph(`${encodeURIComponent(accountId)}/media`), {
      fields:
        "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
      limit: "5",
    }),
    auth,
  );
  const posts: SocialPost[] = await Promise.all(
    (data.data || []).map(async (x: Payload) => {
      const post: SocialPost = {
        id: x.id,
        title: x.caption || "Instagram post",
        url: safeUrl(x.permalink),
        thumbnail: safeUrl(
          x.thumbnail_url || (x.media_type !== "VIDEO" ? x.media_url : null),
        ),
        publishedAt: x.timestamp,
        metrics: {
          ...empty,
          likes: metric(x.like_count),
          comments: metric(x.comments_count),
        },
      };
      try {
        const insights = await json(
          query(graph(`${encodeURIComponent(x.id)}/insights`), {
            metric: "views,reach,saved,shares",
          }),
          auth,
        );
        for (const m of insights.data || []) {
          const key = m.name === "saved" ? "saves" : m.name;
          if (["views", "reach", "saves", "shares"].includes(key))
            post.metrics[key as keyof typeof empty] = metric(
              m.values?.[0]?.value ?? m.total_value?.value,
            );
        }
      } catch {
        post.warning =
          "Some insights are unavailable for this media or permission level.";
      }
      return post;
    }),
  );
  return latestFive(posts);
}
