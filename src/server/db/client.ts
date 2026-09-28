import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import * as schema from "./schema";

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

/** Neon's Vercel integration sets DATABASE_URL (and POSTGRES_URL as an alias). */
export const databaseUrl = () => process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
export const LOCAL_DATA_DIR = process.env.PGLITE_DATA_DIR ?? ".data/pglite";

interface Connection {
  db: Database;
  driver: "neon" | "pglite";
  close: () => Promise<void>;
}

/**
 * Neon (serverless HTTP) when DATABASE_URL is set, otherwise an embedded
 * PGlite Postgres stored on disk so local development needs no setup.
 */
export function connect(): Connection {
  const url = databaseUrl();
  if (url) {
    return { db: drizzleNeon(neon(url), { schema }) as unknown as Database, driver: "neon", close: async () => {} };
  }
  if (process.env.VERCEL) {
    throw new Error("DATABASE_URL is not set. Add a Neon database from the Vercel dashboard (Storage → Neon).");
  }
  mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  const client = new PGlite(LOCAL_DATA_DIR);
  return { db: drizzlePglite(client, { schema }) as unknown as Database, driver: "pglite", close: () => client.close() };
}

// One connection per process (and across dev hot reloads). Created lazily so
// importing this module — e.g. during `next build` — never opens the database.
const globalForDb = globalThis as typeof globalThis & { __threadlineConnection?: Connection };

function connection() {
  return (globalForDb.__threadlineConnection ??= connect());
}

export const db = new Proxy({} as Database, {
  get(_target, property) {
    const real = connection().db;
    const value = Reflect.get(real, property, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
