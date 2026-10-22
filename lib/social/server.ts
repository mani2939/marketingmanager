import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { access } from "@/lib/auth";
import { SESSION_COOKIE, sameOrigin } from "@/lib/auth-policy";
import { readyDatabase } from "@/lib/db";
import { isWorkspace } from "@/lib/workspaces";
import { hash, seal, unseal } from "./security";
import { ProviderError, fetchPosts, refreshCredentials } from "./providers";
import type { Credentials, SocialProvider } from "./types";
export const noStore = { "Cache-Control": "private, no-store" };
export function reply(data: unknown, status = 200) {
  return Response.json(data, { status, headers: noStore });
}
export async function guard(request: Request, mutation = false) {
  const session = await access();
  if (!session.ok)
    return { error: reply({ error: session.error }, session.status) } as const;
  if (mutation && !sameOrigin(request))
    return { error: reply({ error: "Invalid request origin." }, 403) } as const;
  const workspace = new URL(request.url).searchParams.get("workspace") || "";
  if (!isWorkspace(workspace))
    return { error: reply({ error: "Unknown workspace." }, 400) } as const;
  return {
    workspace,
    sessionHash: hash((await cookies()).get(SESSION_COOKIE)!.value),
  } as const;
}
export async function currentSessionHash() {
  return hash((await cookies()).get(SESSION_COOKIE)?.value || "");
}
export function unavailable() {
  return reply(
    {
      error:
        "Social storage is unavailable. Check the database and social configuration.",
    },
    503,
  );
}
export async function syncAccount(id: string, workspace: string) {
  const sql = await readyDatabase();
  const lease = randomUUID();
  const [row] =
    await sql`UPDATE social_accounts SET sync_started_at=now(),sync_lease=${lease} WHERE id=${id} AND workspace=${workspace}
 AND (sync_started_at IS NULL OR sync_started_at < now()-interval '2 minutes')
 AND (last_synced_at IS NULL OR last_synced_at < now()-interval '1 minute') RETURNING *`;
  if (!row)
    return {
      ok: false,
      error:
        "Account is missing, already refreshing, or was refreshed within the last minute.",
    };
  try {
    const context = `account:${row.workspace}:${row.provider}:${row.account_id}`;
    const old = unseal<Credentials>(row.credentials, context);
    const token = await refreshCredentials(row.provider as SocialProvider, old);
    // Persist rotating refresh tokens before fetching posts, even when the next API call fails.
    if (token !== old)
      await sql`UPDATE social_accounts SET credentials=${seal(token, context)},updated_at=now() WHERE id=${id} AND workspace=${workspace} AND sync_lease=${lease}`;
    const posts = await fetchPosts(
      row.provider as SocialProvider,
      row.account_id,
      token,
    );
    const saved = await sql.begin(async (tx) => {
      const existing =
        await tx`SELECT id FROM social_accounts WHERE id=${id} AND workspace=${workspace} AND sync_lease=${lease} FOR UPDATE`;
      if (!existing.length) return false;
      await tx`DELETE FROM social_posts WHERE account_id=${id}`;
      for (const p of posts)
        await tx`INSERT INTO social_posts(account_id,post_id,title,url,thumbnail,published_at,metrics,warning)
 VALUES(${id},${p.id},${p.title},${p.url},${p.thumbnail},${p.publishedAt},${JSON.stringify(p.metrics)}::jsonb,${p.warning || null})`;
      await tx`UPDATE social_accounts SET status='connected',last_synced_at=now(),last_error=NULL,sync_started_at=NULL,sync_lease=NULL,updated_at=now() WHERE id=${id}`;
      return true;
    });
    return saved
      ? { ok: true }
      : {
          ok: false,
          error:
            "This account was disconnected or reconnected during refresh. Refresh again if needed.",
        };
  } catch (e) {
    const reconnect = e instanceof ProviderError && e.reconnect;
    const message =
      e instanceof ProviderError
        ? e.message
        : "Refresh failed. Check provider configuration and try again. Saved results have been retained.";
    await sql`UPDATE social_accounts SET status=${reconnect ? "reconnect" : "error"},last_error=${message},sync_started_at=NULL,sync_lease=NULL WHERE id=${id} AND workspace=${workspace} AND sync_lease=${lease}`;
    return { ok: false, error: message };
  }
}
