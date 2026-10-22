import "server-only";
import postgres from "postgres";
import { connectionUrl, migrate } from "@/scripts/database.mjs";
let sql: ReturnType<typeof postgres> | undefined;
let initialization: Promise<unknown> | undefined;
export function databaseConfigured() {
  return Boolean(connectionUrl());
}
export function database() {
  const url = connectionUrl();
  if (!url) throw new Error("Database not configured");
  sql ??= postgres(url, {
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
  return sql;
}
export async function readyDatabase() {
  const client = database();
  initialization ??= migrate(client).catch((error: unknown) => {
    initialization = undefined;
    throw error;
  });
  await initialization;
  return client;
}
