import { readyDatabase } from "@/lib/db";
import { authorizeUrl } from "@/lib/social/providers";
import { configurationIssue } from "@/lib/social/config";
import { hash, randomToken } from "@/lib/social/security";
import { guard, reply, unavailable } from "@/lib/social/server";
import { isProvider } from "@/lib/social/types";
export async function POST(request: Request) {
  const g = await guard(request, true);
  if (g.error) return g.error;
  const provider = new URL(request.url).searchParams.get("provider") || "";
  if (!isProvider(provider)) return reply({ error: "Unknown provider." }, 400);
  const issue = configurationIssue(provider);
  if (issue) return reply({ error: issue }, 503);
  try {
    const state = randomToken(),
      verifier = randomToken(),
      sql = await readyDatabase();
    await sql`DELETE FROM social_oauth_flows WHERE expires_at < now()`;
    await sql`DELETE FROM social_pending_connections WHERE expires_at < now()`;
    await sql`INSERT INTO social_oauth_flows(state_hash,session_hash,workspace,provider,verifier,expires_at) VALUES(${hash(state)},${g.sessionHash},${g.workspace},${provider},${verifier},now()+interval '10 minutes')`;
    return reply({ url: authorizeUrl(provider, state, verifier) });
  } catch {
    return unavailable();
  }
}
