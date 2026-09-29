import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "./db";
import { resetTokens, staff, tenants } from "./db/schema";

const RESET_TTL_MS = 30 * 60_000;
const INVITE_TTL_MS = 72 * 60 * 60_000;

const digest = (token: string) => createHash("sha256").update(token).digest("hex");

/** Issues a single-use token (replacing any outstanding ones) and returns the raw value to email. */
export async function issueResetToken(staffId: number, purpose: "reset" | "invite" = "reset") {
  await revokeResetTokens(staffId);
  const token = randomBytes(32).toString("base64url");
  await db.insert(resetTokens).values({
    tokenHash: digest(token),
    staffId,
    purpose,
    expiresAt: new Date(Date.now() + (purpose === "invite" ? INVITE_TTL_MS : RESET_TTL_MS)),
  });
  return token;
}

export async function revokeResetTokens(staffId: number) {
  await db.delete(resetTokens).where(eq(resetTokens.staffId, staffId));
}

/** Looks a token up without consuming it; expired tokens and inactive accounts don't match. */
export async function findResetToken(token: string) {
  const [row] = await db
    .select({
      staffId: resetTokens.staffId,
      purpose: resetTokens.purpose,
      email: staff.email,
      name: staff.name,
      tenantStatus: tenants.status,
    })
    .from(resetTokens)
    .innerJoin(staff, eq(staff.id, resetTokens.staffId))
    .innerJoin(tenants, eq(tenants.id, staff.tenantId))
    .where(and(eq(resetTokens.tokenHash, digest(token)), gt(resetTokens.expiresAt, new Date()), eq(staff.active, true)));
  return row ?? null;
}

/**
 * Base URL for links in emails. Taken from APP_URL rather than the request's
 * Host header, which an attacker could spoof to steal reset tokens.
 */
export function appUrl(fallbackOrigin: string) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL && process.env.VERCEL_ENV === "production") {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.NODE_ENV === "production") {
    console.warn("[auth] APP_URL is not set; reset links fall back to the request origin.");
  }
  return fallbackOrigin;
}
