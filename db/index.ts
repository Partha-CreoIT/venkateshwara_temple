import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set — see .env.example");
}

// Reuse the connection across hot reloads in dev to avoid exhausting Postgres.
const globalForDb = globalThis as unknown as {
  __templeSql?: ReturnType<typeof postgres>;
};

const sql = globalForDb.__templeSql ?? postgres(databaseUrl, { prepare: false });
if (process.env.NODE_ENV !== "production") {
  globalForDb.__templeSql = sql;
}

export const db = drizzle(sql, { schema });
export * from "./schema";
