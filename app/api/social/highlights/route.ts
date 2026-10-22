import { readyDatabase } from "@/lib/db";
import { guard, reply, unavailable } from "@/lib/social/server";
export async function GET(request: Request) {
  const g = await guard(request);
  if (g.error) return g.error;
  try {
    const sql = await readyDatabase();
    const accounts =
      await sql`SELECT id,provider,name,status,last_synced_at AS "lastSyncedAt",last_error AS "lastError" FROM social_accounts WHERE workspace=${g.workspace} ORDER BY provider,name`;
    const posts =
      await sql`SELECT p.account_id AS "accountId",p.post_id AS id,p.title,p.url,p.thumbnail,p.published_at AS "publishedAt",p.metrics,p.warning FROM social_accounts a CROSS JOIN LATERAL (SELECT * FROM social_posts WHERE account_id=a.id ORDER BY published_at DESC LIMIT 5) p WHERE a.workspace=${g.workspace}`;
    return reply({
      accounts: accounts.map((a) => ({
        ...a,
        posts: posts.filter((p) => p.accountId === a.id),
      })),
    });
  } catch {
    return unavailable();
  }
}
