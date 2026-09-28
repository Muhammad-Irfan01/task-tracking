import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd());
const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

/**
 * `npm run db:generate` diffs src/server/db/schema.ts into SQL migrations under
 * ./drizzle. `db:studio` browses Neon when DATABASE_URL is set, else local PGlite.
 */
export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  ...(url
    ? { dbCredentials: { url } }
    : { driver: "pglite", dbCredentials: { url: process.env.PGLITE_DATA_DIR ?? ".data/pglite" } }),
});
