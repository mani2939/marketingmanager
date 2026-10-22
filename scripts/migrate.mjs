import { readFile } from "node:fs/promises";
import postgres from "postgres";
if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL before running the migration.");
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  await sql.unsafe(
    await readFile(new URL("../db/001_initial.sql", import.meta.url), "utf8"),
  );
  console.log("Migration complete.");
} finally {
  await sql.end();
}
