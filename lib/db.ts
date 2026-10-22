import "server-only";
import postgres from "postgres";
let sql: ReturnType<typeof postgres> | undefined;
export function database() {
  if (!process.env.DATABASE_URL) throw new Error("Database not configured");
  sql ??= postgres(process.env.DATABASE_URL, {
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
  return sql;
}
