import { access } from "@/lib/auth";
import { readyDatabase, databaseConfigured } from "@/lib/db";
import { contentSchema } from "@/lib/content";
import { isWorkspace } from "@/lib/workspaces";
const select = `id, workspace, kind, title, body, channel, status, scheduled_at AS "scheduledAt", updated_at AS "updatedAt"`;
export async function GET(request: Request) {
  const session = await access();
  if (!session.ok)
    return Response.json({ error: session.error }, { status: session.status });
  const workspace = new URL(request.url).searchParams.get("workspace") ?? "";
  if (!isWorkspace(workspace))
    return Response.json({ error: "Unknown workspace" }, { status: 400 });
  if (!databaseConfigured())
    return Response.json(
      { error: "Connect Neon to this deployment environment to save content." },
      { status: 503 },
    );
  try {
    const rows = await (
      await readyDatabase()
    ).unsafe(
      `SELECT ${select} FROM marketing_content WHERE workspace = $1 ORDER BY updated_at DESC LIMIT 1000`,
      [workspace],
    );
    return Response.json(rows, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json(
      {
        error:
          "Content storage is unavailable. Check the database connection and migration.",
      },
      { status: 503 },
    );
  }
}
export async function POST(request: Request) {
  const session = await access();
  if (!session.ok)
    return Response.json({ error: session.error }, { status: session.status });
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "Invalid request origin" }, { status: 403 });
  if (!databaseConfigured())
    return Response.json(
      { error: "Connect Neon to this deployment environment to save content." },
      { status: 503 },
    );
  const body = await request.text();
  if (body.length > 50000)
    return Response.json({ error: "Content is too large" }, { status: 413 });
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = contentSchema.safeParse(value);
  if (!parsed.success)
    return Response.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  const c = parsed.data;
  try {
    const sql = await readyDatabase();
    const rows =
      await sql`INSERT INTO marketing_content (id,workspace,kind,title,body,channel,status,scheduled_at,created_by)
      VALUES (${c.id},${c.workspace},${c.kind},${c.title},${c.body},${c.channel},${c.status},${c.scheduledAt},${session.userId})
      ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,body=EXCLUDED.body,channel=EXCLUDED.channel,status=EXCLUDED.status,scheduled_at=EXCLUDED.scheduled_at,updated_at=now()
      WHERE marketing_content.workspace=EXCLUDED.workspace AND marketing_content.kind=EXCLUDED.kind RETURNING id`;
    if (!rows.length)
      return Response.json(
        { error: "Content belongs to another workspace or type." },
        { status: 409 },
      );
    return Response.json({ id: c.id });
  } catch {
    return Response.json(
      { error: "Could not save. Please check the database and try again." },
      { status: 503 },
    );
  }
}
