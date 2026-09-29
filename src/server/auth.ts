import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { PLATFORM_COOKIE, SESSION_COOKIE } from "@/lib/constants";
import {
  forgotPasswordSchema,
  loginSchema,
  passwordSchema,
  profileSchema,
  resetPasswordSchema,
  toFieldErrors,
} from "@/lib/schemas";
import type { LoginResult, PlatformUser, SessionUser } from "@/types";
import { db } from "./db";
import { departments, staff, superAdmins, tenants } from "./db/schema";
import { agents, employees } from "./domain/directory";
import { forbidden, invalid, unauthorized } from "./errors";
import { sendMail } from "./mail";
import { appUrl, findResetToken, issueResetToken, revokeResetTokens } from "./password-reset";
import { hashPassword, verifyPassword } from "./passwords";
import { MINUTE, rateLimit } from "./rate-limit";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
// A blank value counts as unset: an empty HMAC key is as forgeable as a public one.
const CONFIGURED_SECRET = process.env.SESSION_SECRET?.trim() || null;
const DEV_SECRET = "threadline-dev-secret-change-me";

if (process.env.NODE_ENV === "production" && !CONFIGURED_SECRET) {
  console.warn("[auth] SESSION_SECRET is not set; using an insecure development secret.");
}

/**
 * On Vercel, refuse to sign or check sessions without a real secret rather
 * than fall back to the public development one (which would let anyone who
 * has read the source forge a login). Checked lazily so builds still succeed.
 */
function sessionSecret() {
  if (CONFIGURED_SECRET) return CONFIGURED_SECRET;
  if (process.env.VERCEL) {
    throw new Error("SESSION_SECRET is missing or empty. Set it in Vercel → Settings → Environment Variables and redeploy.");
  }
  return DEV_SECRET;
}

// ------------------------------------------------------------------ tokens

/**
 * Binding the signature to the password salt logs out other sessions on password change.
 * The scope keeps an agent token from ever verifying as a super-admin token with the same id.
 */
function sign(staffId: number, issuedAt: number, salt: string | null, scope: "staff" | "platform" = "staff") {
  const payload = `${scope === "platform" ? "platform." : ""}${staffId}.${issuedAt}.${salt ?? ""}`;
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function parseToken(token: string | undefined) {
  if (!token) return null;
  const [id, issued, signature] = token.split(".");
  const staffId = Number(id);
  const issuedAt = Number(issued);
  if (!Number.isInteger(staffId) || !Number.isInteger(issuedAt) || !signature) return null;
  if (Date.now() / 1000 - issuedAt > SESSION_TTL_SECONDS) return null;
  return { staffId, issuedAt, signature };
}

function signatureMatches(expected: string, actual: string) {
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ------------------------------------------------------------------ users

const sessionColumns = {
  id: staff.id,
  tenantId: staff.tenantId,
  tenantName: tenants.name,
  tenantEmailDomain: tenants.emailDomain,
  tenantStatus: tenants.status,
  name: staff.name,
  email: staff.email,
  role: staff.role,
  kind: staff.kind,
  dept: departments.name,
  isAdmin: staff.isAdmin,
  avatarColor: staff.avatarColor,
  active: staff.active,
  passwordHash: staff.passwordHash,
  passwordSalt: staff.passwordSalt,
};

async function findStaff(where: ReturnType<typeof eq>) {
  const [row] = await db
    .select(sessionColumns)
    .from(staff)
    .innerJoin(departments, eq(departments.id, staff.departmentId))
    .innerJoin(tenants, eq(tenants.id, staff.tenantId))
    .where(where)
    .limit(1);
  return row;
}

function toSessionUser(row: NonNullable<Awaited<ReturnType<typeof findStaff>>>): SessionUser {
  return {
    id: row.id,
    name: row.name,
    firstName: row.name.split(" ")[0],
    email: row.email,
    role: row.role,
    kind: row.kind,
    dept: row.dept,
    isAdmin: row.isAdmin,
    avatarColor: row.avatarColor,
    tenantId: row.tenantId,
    tenantName: row.tenantName,
    tenantEmailDomain: row.tenantEmailDomain,
  };
}

async function writeSessionCookie(staffId: number, salt: string | null, scope: "staff" | "platform" = "staff") {
  const issuedAt = Math.floor(Date.now() / 1000);
  const jar = await cookies();
  // One identity per browser: signing in as one kind of user signs out the other.
  jar.delete(scope === "staff" ? PLATFORM_COOKIE : SESSION_COOKIE);
  jar.set({
    name: scope === "staff" ? SESSION_COOKIE : PLATFORM_COOKIE,
    value: `${staffId}.${issuedAt}.${sign(staffId, issuedAt, salt, scope)}`,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/**
 * The signed-in agent, or null. Reading cookies makes the calling route dynamic;
 * `cache` dedupes the lookup between the layout, page and metadata of one request.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = parseToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!token) return null;
  const row = await findStaff(eq(staff.id, token.staffId));
  if (!row?.active || row.tenantStatus !== "Active") return null;
  return signatureMatches(sign(row.id, token.issuedAt, row.passwordSalt), token.signature) ? toSessionUser(row) : null;
});

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw unauthorized();
  return user;
}

async function setPassword(staffId: number, password: string) {
  const { hash, salt } = hashPassword(password);
  await db.update(staff).set({ passwordHash: hash, passwordSalt: salt }).where(eq(staff.id, staffId));
  return salt;
}

// ------------------------------------------------------------------ sign in / out

const SUSPENDED = "Your organization's account is suspended. Contact your provider.";

/** Signs in an agent, or a super admin when the email belongs to one. */
export async function login(raw: unknown, ip: string): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) throw invalid(toFieldErrors(parsed.error));
  await rateLimit(`login:ip:${ip}`, 30, 15 * MINUTE);
  await rateLimit(`login:email:${parsed.data.email}`, 10, 15 * MINUTE);

  const operator = await findSuperAdmin(eq(superAdmins.email, parsed.data.email));
  if (operator) {
    if (!verifyPassword(parsed.data.password, { salt: operator.passwordSalt, hash: operator.passwordHash })) {
      throw invalid({ password: "Incorrect email or password" }, "Incorrect email or password");
    }
    await writeSessionCookie(operator.id, operator.passwordSalt, "platform");
    return { kind: "platform", user: toPlatformUser(operator) };
  }

  const row = await findStaff(eq(staff.email, parsed.data.email));
  if (!row || !verifyPassword(parsed.data.password, { salt: row.passwordSalt, hash: row.passwordHash })) {
    throw invalid({ password: "Incorrect email or password" }, "Incorrect email or password");
  }
  if (!row.active) throw invalid({ email: "This account has been deactivated" }, "Account deactivated");
  if (row.tenantStatus !== "Active") throw invalid({ email: SUSPENDED }, SUSPENDED);
  await writeSessionCookie(row.id, row.passwordSalt);
  return { kind: "staff", user: toSessionUser(row) };
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(PLATFORM_COOKIE);
}

// ------------------------------------------------------------------ super admins

async function findSuperAdmin(where: ReturnType<typeof eq>) {
  const [row] = await db.select().from(superAdmins).where(where).limit(1);
  return row;
}

function toPlatformUser(row: { id: number; name: string; email: string }): PlatformUser {
  return { id: row.id, name: row.name, email: row.email };
}

/** The signed-in super admin, or null. */
export const getPlatformUser = cache(async (): Promise<PlatformUser | null> => {
  const token = parseToken((await cookies()).get(PLATFORM_COOKIE)?.value);
  if (!token) return null;
  const row = await findSuperAdmin(eq(superAdmins.id, token.staffId));
  if (!row) return null;
  return signatureMatches(sign(row.id, token.issuedAt, row.passwordSalt, "platform"), token.signature) ? toPlatformUser(row) : null;
});

export async function requirePlatformUser() {
  const user = await getPlatformUser();
  if (!user) throw unauthorized("Sign in as a platform administrator");
  return user;
}

// ------------------------------------------------------------------ profile

export async function updateProfile(user: SessionUser, raw: unknown) {
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) throw invalid(toFieldErrors(parsed.error));
  await (user.kind === "employee" ? employees : agents).update(user.id, parsed.data);
  return toSessionUser((await findStaff(eq(staff.id, user.id)))!);
}

export async function changePassword(user: SessionUser, raw: unknown) {
  const parsed = passwordSchema.safeParse(raw);
  if (!parsed.success) throw invalid(toFieldErrors(parsed.error));
  const row = (await findStaff(eq(staff.id, user.id)))!;
  if (!verifyPassword(parsed.data.current, { salt: row.passwordSalt, hash: row.passwordHash })) {
    throw invalid({ current: "Current password is incorrect" });
  }
  const salt = await setPassword(user.id, parsed.data.next);
  await revokeResetTokens(user.id);
  // Re-issue this session; every other session for the user is now invalid.
  await writeSessionCookie(user.id, salt);
}

// ------------------------------------------------------------------ password reset

export interface ForgotPasswordResult {
  /** Development only: the link that would have been emailed. */
  devResetUrl?: string;
}

/**
 * Always resolves the same way whether or not the email exists, so the
 * endpoint can't be used to discover accounts.
 */
export async function requestPasswordReset(raw: unknown, ip: string, origin: string): Promise<ForgotPasswordResult> {
  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) throw invalid(toFieldErrors(parsed.error));
  const { email } = parsed.data;
  await rateLimit(`forgot:ip:${ip}`, 10, 15 * MINUTE);
  await rateLimit(`forgot:email:${email}`, 3, 15 * MINUTE);

  const row = await findStaff(eq(staff.email, email));
  if (!row?.active || row.tenantStatus !== "Active") return {};

  const url = `${appUrl(origin)}/reset-password?token=${await issueResetToken(row.id)}`;
  await sendMail({
    to: row.email,
    subject: "Reset your Threadline password",
    text: `Hi ${row.name.split(" ")[0]},\n\nUse the link below to choose a new password. It expires in 30 minutes and can be used once.\n\n${url}\n\nIf you didn't ask for this, you can ignore this email.`,
  });
  return process.env.NODE_ENV === "production" ? {} : { devResetUrl: url };
}

/** Used by the reset page to show an "expired link" state before the user types anything. */
export async function inspectResetToken(token: string | undefined) {
  if (!token) return { status: "missing" as const };
  const found = await findResetToken(token);
  if (!found) return { status: "invalid" as const };
  return { status: "valid" as const, email: found.email, purpose: found.purpose };
}

export async function resetPassword(raw: unknown, ip: string) {
  await rateLimit(`reset:ip:${ip}`, 10, 15 * MINUTE);
  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) throw invalid(toFieldErrors(parsed.error));

  const found = await findResetToken(parsed.data.token);
  if (!found) {
    throw invalid({ token: "This reset link is invalid or has expired" }, "This reset link is invalid or has expired");
  }
  if (found.tenantStatus !== "Active") throw forbidden(SUSPENDED);

  // New salt invalidates every existing session; tokens are single-use.
  const salt = await setPassword(found.staffId, parsed.data.password);
  await revokeResetTokens(found.staffId);
  await writeSessionCookie(found.staffId, salt);
  await sendMail({
    to: found.email,
    subject: "Your Threadline password was changed",
    text: `Hi ${found.name.split(" ")[0]},\n\nYour password was just changed and other sessions were signed out. If this wasn't you, reset it again and contact an administrator.`,
  });
  return toSessionUser((await findStaff(eq(staff.id, found.staffId)))!);
}

/**
 * Emails a newly created agent a link to set their first password. With
 * `revealUnsent` (platform console only) the link is returned when the email
 * couldn't be sent, so the super admin can pass it on by hand.
 */
export async function sendInvite(staffId: number, invitedBy: { name: string }, origin: string, { revealUnsent = false } = {}) {
  const row = (await findStaff(eq(staff.id, staffId)))!;
  const url = `${appUrl(origin)}/reset-password?token=${await issueResetToken(row.id, "invite")}`;
  const inviteEmailed = await sendMail({
    to: row.email,
    subject: `${invitedBy.name} invited you to ${row.tenantName} on Threadline`,
    text:
      row.kind === "employee"
        ? `Hi ${row.name.split(" ")[0]},\n\n${invitedBy.name} gave you access to the ${row.tenantName} request portal on Threadline, where you can send requests to any department and follow them. Set your password to get started (link valid for 72 hours):\n\n${url}\n\nAfterwards, sign in with this email address.`
        : `Hi ${row.name.split(" ")[0]},\n\n${invitedBy.name} added you to the ${row.tenantName} support desk on Threadline. Set your password to get started (link valid for 72 hours):\n\n${url}\n\nAfterwards, sign in with this email address.`,
  });
  const reveal = process.env.NODE_ENV !== "production" || (revealUnsent && !inviteEmailed);
  return reveal ? { inviteEmailed, inviteUrl: url } : { inviteEmailed };
}
