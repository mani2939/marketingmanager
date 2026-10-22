import postgres from "postgres";
import { connectionUrl, migrate } from "./database.mjs";
const url = connectionUrl(process.env, true);
if (!url) {
  if (process.argv.includes("--if-configured") && process.env.VERCEL !== "1") {
    console.log(
      "Database initialization skipped: no local/CI database is configured.",
    );
    process.exit(0);
  }
  console.error(
    "Database initialization requires DATABASE_URL (or POSTGRES_URL). Connect Neon to this deployment environment.",
  );
  process.exit(1);
}
const sql = postgres(url, {
  max: 1,
  prepare: false,
  connect_timeout: 15,
  idle_timeout: 5,
});
try {
  const applied = await migrate(sql);
  console.log(
    applied.length
      ? `Database initialized: ${applied.join(", ")}`
      : "Database schema is up to date.",
  );
} catch (error) {
  // Do not log connection URLs, SQL parameters, or driver errors containing secrets.
  console.error(
    "Database initialization failed. Check Neon connectivity and schema permissions.",
  );
  if (
    error instanceof Error &&
    error.message.startsWith("Applied migration changed:")
  )
    console.error(error.message);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
