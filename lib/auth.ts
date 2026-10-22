import "server-only";
import { cookies } from "next/headers";
import { readyDatabase } from "@/lib/db";
import {
  ADMIN_USERNAME,
  SESSION_COOKIE,
  authenticationConfig,
  credentialVersion,
  sessionHash,
  validSessionToken,
} from "@/lib/auth-policy";
export function authConfigured() {
  return Boolean(authenticationConfig());
}
export async function access() {
  const config = authenticationConfig();
  if (!config)
    return {
      ok: false as const,
      status: 503,
      error: "Administrator login has not been configured.",
    };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !validSessionToken(token))
    return { ok: false as const, status: 401, error: "Please sign in." };
  try {
    const sql = await readyDatabase();
    const rows =
      await sql`SELECT username FROM strozpy_sessions WHERE token_hash=${sessionHash(token)} AND username=${ADMIN_USERNAME} AND credential_version=${credentialVersion(config.password, config.secret)} AND expires_at > now()`;
    if (!rows.length)
      return {
        ok: false as const,
        status: 401,
        error: "Your session has expired. Please sign in.",
      };
    return { ok: true as const, userId: ADMIN_USERNAME };
  } catch {
    console.error("Session verification failed: database unavailable.");
    return {
      ok: false as const,
      status: 503,
      error:
        "The workspace database is temporarily unavailable. Please try again.",
    };
  }
}
