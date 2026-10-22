import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { connectionUrl } from "../scripts/database.mjs";
test("Neon and existing Postgres connection names resolve without a new database", () => {
  assert.equal(
    connectionUrl({ DATABASE_URL: "pooled", DATABASE_URL_UNPOOLED: "direct" }),
    "pooled",
  );
  assert.equal(
    connectionUrl(
      { DATABASE_URL: "pooled", DATABASE_URL_UNPOOLED: "direct" },
      true,
    ),
    "direct",
  );
  assert.equal(
    connectionUrl(
      { POSTGRES_URL: "legacy", POSTGRES_URL_NON_POOLING: "direct" },
      true,
    ),
    "direct",
  );
  assert.equal(connectionUrl({ POSTGRES_URL: "legacy" }), "legacy");
  assert.equal(connectionUrl({}), "");
});
test("Vercel selects Next.js output rather than the static public directory", async () => {
  const config = JSON.parse(await readFile("vercel.json", "utf8"));
  assert.equal(config.framework, "nextjs");
  assert.equal(config.outputDirectory, ".next");
  assert.equal(config.buildCommand, "npm run build");
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  assert.ok(
    pkg.scripts.build.indexOf("scripts/migrate.mjs") <
      pkg.scripts.build.indexOf("next build"),
  );
});

test("SQL initialization is repeatable and preserves existing content", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { migrate } = await import("../scripts/database.mjs");
  const db = new PGlite();
  // Thin parameter adapter: execute the actual migration SQL in embedded PostgreSQL.
  function adapter(client: {
    query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
    exec: (sql: string) => Promise<unknown>;
  }) {
    const tag = async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const statement = strings.reduce(
        (text, part, index) => text + (index ? "$" + index : "") + part,
        "",
      );
      return (await client.query(statement, values)).rows;
    };
    return Object.assign(tag, {
      unsafe: async (statement: string) => {
        await client.exec(statement);
      },
    });
  }
  const sql = {
    begin: async (
      callback: (tx: ReturnType<typeof adapter>) => Promise<unknown>,
    ) => db.transaction((tx) => callback(adapter(tx))),
  };
  try {
    const first = await migrate(sql);
    assert.deepEqual(first, ["001_initial.sql", "002_admin_sessions.sql"]);
    await db.query(
      "INSERT INTO marketing_content(id,workspace,kind,title,channel,created_by) VALUES ($1,'foxyavenue','post','Preserve this draft','Instagram','legacy-user')",
      ["7aacbe11-7f48-4aad-9aad-f94e9713f6cc"],
    );
    assert.deepEqual(await migrate(sql), []);
    const rows = await db.query<{ title: string }>(
      "SELECT title FROM marketing_content",
    );
    assert.equal(rows.rows[0].title, "Preserve this draft");
    const ledger = await db.query("SELECT name FROM strozpy_schema_migrations");
    assert.equal(ledger.rows.length, 2);
    await db.query(
      "INSERT INTO strozpy_sessions(token_hash,username,credential_version,expires_at) VALUES ('hashed-token','StrozpyManager','version',now()+interval '8 hours')",
    );
    await db.query(
      "DELETE FROM strozpy_sessions WHERE token_hash='hashed-token'",
    );
    assert.equal(
      (await db.query("SELECT * FROM strozpy_sessions")).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
