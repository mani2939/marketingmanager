import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";

/** @param {Record<string, string | undefined>} env */
export function connectionUrl(env = process.env, migration = false) {
  if (migration)
    return (
      env.DATABASE_URL_UNPOOLED ||
      env.POSTGRES_URL_NON_POOLING ||
      connectionUrl(env)
    );
  return env.DATABASE_URL || env.POSTGRES_URL || env.POSTGRES_PRISMA_URL || "";
}

/** Transactional migrations shared by build initialization and cold-start recovery. */
export async function migrate(sql) {
  const names = (await readdir(join(process.cwd(), "db")))
    .filter((name) => /^\d+_[\w-]+\.sql$/.test(name))
    .sort();
  const migrations = await Promise.all(
    names.map(async (name) => {
      const content = await readFile(join(process.cwd(), "db", name), "utf8");
      return {
        name,
        content,
        checksum: createHash("sha256").update(content).digest("hex"),
      };
    }),
  );
  return sql.begin(async (tx) => {
    // Serialize deploys and cold starts; transaction-scoped locks work through Neon pooling.
    await tx`SELECT pg_advisory_xact_lock(62854121)`;
    await tx`CREATE TABLE IF NOT EXISTS strozpy_schema_migrations (
      name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()
    )`;
    const applied =
      await tx`SELECT name, checksum FROM strozpy_schema_migrations`;
    const known = new Map(applied.map((row) => [row.name, row.checksum]));
    const completed = [];
    for (const migration of migrations) {
      if (known.has(migration.name)) {
        if (known.get(migration.name) !== migration.checksum)
          throw new Error(
            `Applied migration changed: ${migration.name}. Add a new migration instead.`,
          );
        continue;
      }
      await tx.unsafe(migration.content);
      await tx`INSERT INTO strozpy_schema_migrations (name, checksum) VALUES (${migration.name}, ${migration.checksum})`;
      completed.push(migration.name);
    }
    return completed;
  });
}
