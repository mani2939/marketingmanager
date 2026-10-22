export const socialProviders = [
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
] as const;
export type SocialProvider = (typeof socialProviders)[number];
export const providerLabels: Record<SocialProvider, string> = {
  instagram: "Instagram",
  facebook: "Facebook Pages",
  tiktok: "TikTok",
  youtube: "YouTube",
};
export function isProvider(value: string): value is SocialProvider {
  return socialProviders.includes(value as SocialProvider);
}
export type Credentials = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scopes?: string;
  uploadsPlaylist?: string;
};
export type Candidate = {
  accountId: string;
  name: string;
  provider: SocialProvider;
  credentials: Credentials;
};
export type Metrics = {
  views: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
};
export type SocialPost = {
  id: string;
  title: string;
  url: string | null;
  thumbnail: string | null;
  publishedAt: string;
  metrics: Metrics;
  warning?: string;
};
export function metric(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
export function safeUrl(value: unknown): string | null {
  try {
    const u = new URL(String(value));
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}
export function latestFive(posts: SocialPost[]) {
  return [
    ...new Map(
      posts
        .filter((p) => p.id && Number.isFinite(Date.parse(p.publishedAt)))
        .map((p) => [p.id, p]),
    ).values(),
  ]
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 5);
}
