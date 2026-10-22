import { readyDatabase } from "@/lib/db";
import { configurationIssue } from "@/lib/social/config";
import { guard, reply, unavailable } from "@/lib/social/server";
import { socialProviders } from "@/lib/social/types";
export async function GET(request: Request) {
  const g = await guard(request);
  if (g.error) return g.error;
  try {
    const sql = await readyDatabase();
    const accounts =
      await sql`SELECT id,provider,account_id AS "accountId",name,status,last_synced_at AS "lastSyncedAt",last_error AS "lastError" FROM social_accounts WHERE workspace=${g.workspace} ORDER BY provider,name`;
    return reply({
      accounts,
      providers: socialProviders.map((id) => ({
        id,
        issue: configurationIssue(id),
      })),
    });
  } catch {
    return unavailable();
  }
}
export async function DELETE(request: Request) {
  const g = await guard(request, true);
  if (g.error) return g.error;
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return reply({ error: "Invalid account." }, 400);
  try {
    const sql = await readyDatabase();
    await sql`DELETE FROM social_accounts WHERE id=${id} AND workspace=${g.workspace}`;
    return reply({ ok: true });
  } catch {
    return unavailable();
  }
}
