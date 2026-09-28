import { lt, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "./db";
import { rateLimits } from "./db/schema";
import { HttpError } from "./errors";

export const MINUTE = 60_000;

/**
 * Fixed-window limiter stored in Postgres so every serverless instance shares
 * the same counters. One atomic upsert per check.
 */
export async function rateLimit(key: string, limit: number, windowMs: number) {
  const resetAt = new Date(Date.now() + windowMs);
  const [bucket] = await db
    .insert(rateLimits)
    .values({ key, count: 1, resetAt })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.resetAt} <= now() then 1 else ${rateLimits.count} + 1 end`,
        resetAt: sql`case when ${rateLimits.resetAt} <= now() then excluded.reset_at else ${rateLimits.resetAt} end`,
      },
    })
    .returning({ count: rateLimits.count, resetAt: rateLimits.resetAt });

  // Opportunistic cleanup of long-expired buckets.
  if (Math.random() < 0.02) {
    await db.delete(rateLimits).where(lt(rateLimits.resetAt, new Date(Date.now() - 24 * 60 * MINUTE)));
  }

  if (bucket.count > limit) {
    const minutes = Math.max(1, Math.ceil((new Date(bucket.resetAt).getTime() - Date.now()) / MINUTE));
    throw new HttpError(429, `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`);
  }
}

export function clientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}
