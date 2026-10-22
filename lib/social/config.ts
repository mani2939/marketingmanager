import "server-only";
import type { SocialProvider } from "./types";
import { encryptionKey } from "./security";
export function appOrigin() {
  const u = new URL(process.env.APP_URL || "");
  if (
    u.username ||
    u.password ||
    u.pathname !== "/" ||
    u.search ||
    u.hash ||
    (u.protocol !== "https:" &&
      !(process.env.NODE_ENV !== "production" && u.hostname === "localhost"))
  )
    throw new Error("Configure APP_URL as the application HTTPS origin.");
  return u.origin;
}
export function providerConfig(provider: SocialProvider) {
  const prefix =
    provider === "instagram" || provider === "facebook"
      ? "META"
      : provider === "youtube"
        ? "GOOGLE"
        : "TIKTOK";
  const clientId = process.env[`${prefix}_CLIENT_ID`],
    secret = process.env[`${prefix}_CLIENT_SECRET`];
  if (!clientId || !secret)
    throw new Error(`Set ${prefix}_CLIENT_ID and ${prefix}_CLIENT_SECRET.`);
  const version = process.env.META_GRAPH_VERSION;
  if (prefix === "META" && !/^v\d+\.\d+$/.test(version || ""))
    throw new Error(
      "Set META_GRAPH_VERSION to the version configured in your Meta app.",
    );
  return {
    clientId,
    secret,
    version,
    callback: `${appOrigin()}/api/social/callback/${provider}`,
  };
}
export function configurationIssue(provider: SocialProvider) {
  try {
    encryptionKey();
    providerConfig(provider);
    return null;
  } catch (e) {
    return e instanceof Error
      ? e.message
      : "Social connection configuration is incomplete.";
  }
}
