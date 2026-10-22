import { randomUUID } from "node:crypto";
import { readyDatabase } from "@/lib/db";
import { seal, unseal } from "@/lib/social/security";
import { guard, reply, unavailable } from "@/lib/social/server";
import type { Candidate } from "@/lib/social/types";
async function handle(request: Request, save: boolean) {
  const g = await guard(request, save);
  if (g.error) return g.error;
  const params = new URL(request.url).searchParams,
    id = params.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return reply({ error: "Invalid connection attempt." }, 400);
  try {
    const sql = await readyDatabase();
    return await sql.begin(async (tx) => {
      const [row] =
        await tx`SELECT * FROM social_pending_connections WHERE id=${id} AND workspace=${g.workspace} AND session_hash=${g.sessionHash} AND expires_at>now() FOR UPDATE`;
      if (!row)
        return reply(
          { error: "Account selection expired. Please connect again." },
          410,
        );
      const candidates = unseal<Candidate[]>(row.candidates, `pending:${id}`);
      if (!save)
        return reply({
          candidates: candidates.map((c, index) => ({
            index,
            name: c.name,
            accountId: c.accountId,
            provider: c.provider,
          })),
        });
      const index = Number(params.get("index"));
      if (
        !params.has("index") ||
        !Number.isInteger(index) ||
        !candidates[index]
      )
        return reply({ error: "Choose an account." }, 400);
      const c = candidates[index];
      const [saved] =
        await tx`INSERT INTO social_accounts(id,workspace,provider,account_id,name,credentials) VALUES(${randomUUID()},${g.workspace},${c.provider},${c.accountId},${c.name},${seal(c.credentials, `account:${g.workspace}:${c.provider}:${c.accountId}`)})
 ON CONFLICT(workspace,provider,account_id) DO UPDATE SET name=EXCLUDED.name,credentials=EXCLUDED.credentials,status='connected',last_error=NULL,last_synced_at=NULL,sync_started_at=NULL,sync_lease=NULL,updated_at=now() RETURNING id`;
      await tx`DELETE FROM social_pending_connections WHERE id=${id}`;
      return reply({ ok: true, id: saved.id });
    });
  } catch {
    return unavailable();
  }
}
export const GET = (request: Request) => handle(request, false);
export const POST = (request: Request) => handle(request, true);
