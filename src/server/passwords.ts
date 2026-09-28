import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export interface PasswordHash {
  salt: string;
  hash: string;
}

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")): PasswordHash {
  return { salt, hash: scryptSync(password, salt, 32).toString("hex") };
}

export function verifyPassword(password: string, stored: { salt: string | null; hash: string | null }) {
  if (!stored.salt || !stored.hash) return false;
  const attempt = Buffer.from(scryptSync(password, stored.salt, 32).toString("hex"));
  const expected = Buffer.from(stored.hash);
  return attempt.length === expected.length && timingSafeEqual(attempt, expected);
}

/** Password every seeded agent can sign in with. */
export const DEMO_PASSWORD = "threadline";
/** Fixed so seeded sessions (signed with the salt) stay valid across re-seeds of the same data. */
export const DEMO_SALT = "threadline-demo-credential";
