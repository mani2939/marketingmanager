import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { access } from "@/lib/auth";
import { readyDatabase } from "@/lib/db";
import { appOrigin } from "@/lib/social/config";
import { exchange } from "@/lib/social/providers";
import { hash, seal } from "@/lib/social/security";
import { currentSessionHash, reply } from "@/lib/social/server";
import { isProvider } from "@/lib/social/types";
export const maxDuration = 60;
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const session = await access();
  if (!session.ok) return reply({ error: session.error }, session.status);
  const { provider } = await params;
  if (!isProvider(provider)) return reply({ error: "Unknown provider." }, 400);
  const url = new URL(request.url),
    state = url.searchParams.get("state") || "";
  if (!/^[A-Za-z0-9_-]{43}$/.test(state))
    return reply({ error: "Invalid or expired connection attempt." }, 400);
  let workspace = "";
  try {
    const sql = await readyDatabase(),
      binding = await currentSessionHash();
    const [flow] =
      await sql`DELETE FROM social_oauth_flows WHERE state_hash=${hash(state)} AND session_hash=${binding} AND provider=${provider} AND expires_at>now() RETURNING *`;
    if (!flow)
      return reply(
        {
          error:
            "This connection attempt expired or belongs to a different login. Start again from Settings.",
        },
        400,
      );
    workspace = flow.workspace;
    if (url.searchParams.has("error")) throw new Error("Denied");
    const code = url.searchParams.get("code");
    if (!code) throw new Error("Missing code");
    const candidates = await exchange(provider, code, flow.verifier);
    if (!candidates.length) throw new Error("No eligible accounts");
    const id = randomUUID();
    await sql`INSERT INTO social_pending_connections(id,session_hash,workspace,candidates,expires_at) VALUES(${id},${binding},${workspace},${seal(candidates, `pending:${id}`)},now()+interval '10 minutes')`;
    const result = new URL("/dashboard/settings", appOrigin());
    result.searchParams.set("workspace", workspace);
    result.searchParams.set("pending", id);
    return NextResponse.redirect(result, {
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    const result = new URL("/dashboard/settings", appOrigin());
    if (workspace) result.searchParams.set("workspace", workspace);
    result.searchParams.set("connection", "failed");
    return NextResponse.redirect(result, {
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  }
}
