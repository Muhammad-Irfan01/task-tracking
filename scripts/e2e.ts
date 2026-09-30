/**
 * Helpers for the end-to-end checks in scripts/test-*.ts. They talk to a running
 * `npm run dev` over HTTP; BASE_URL overrides http://localhost:3000.
 */

export const BASE = process.env.BASE_URL ?? "http://localhost:3000";
export const DEMO_PASSWORD = "threadline";

export type Session = { cookie: string };
export const anonymous: Session = { cookie: "" };

export async function call(session: Session, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (session.cookie) headers.set("cookie", session.cookie);
  return fetch(BASE + path, { ...init, headers, redirect: "manual" });
}

/** A JSON API call that must succeed; returns the response's `data`. */
export async function json(session: Session, method: string, path: string, body?: unknown) {
  const res = await send(session, method, path, body);
  const payload = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(payload)}`);
  return payload.data;
}

/** A JSON API call whose status the caller checks. */
export function send(session: Session, method: string, path: string, body?: unknown) {
  return call(session, path, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function login(email: string, password = DEMO_PASSWORD): Promise<Session> {
  const res = await send(anonymous, "POST", "/api/auth/login", { email, password });
  if (!res.ok) throw new Error(`login ${email} -> ${res.status} ${await res.text()}`);
  return { cookie: res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ") };
}

/** Sets the password from an invite link and signs in with it. */
async function acceptInvite(inviteUrl: string, email: string, password: string) {
  const token = new URL(inviteUrl).searchParams.get("token");
  await json(anonymous, "POST", "/api/auth/reset-password", { token, password, confirm: password });
  return login(email, password);
}

/**
 * A throwaway organization created through the platform console, with its first admin
 * signed in. `remove()` deletes it and everything in it.
 */
export async function createTempOrg(label: string) {
  const stamp = Date.now();
  const name = `${label} ${stamp}`;
  const domain = `${label.toLowerCase().replace(/[^a-z]/g, "")}${stamp}.example`;
  const password = "TempOrg123";
  const owner = await login("owner@threadline.io");
  const org = await json(owner, "POST", "/api/platform/tenants", {
    name,
    supportEmail: `support@${domain}`,
    emailDomain: domain,
    timezone: "UTC (UTC+00:00)",
    plan: "Small",
    adminName: "Temp Admin",
    adminEmail: `admin@${domain}`,
  });
  const admin = await acceptInvite(org.inviteUrl, `admin@${domain}`, password);

  return {
    id: org.id as number,
    name,
    admin,
    /** A regular (non-admin) agent in this organization. */
    async addAgent(local = "agent") {
      const email = `${local}@${domain}`;
      const agent = await json(admin, "POST", "/api/staff", {
        name: "Temp Agent",
        email,
        dept: "General Support",
        role: "Agent",
        isAdmin: false,
        active: true,
        onVacation: false,
      });
      return acceptInvite(agent.inviteUrl, email, password);
    },
    /** A portal employee in this organization. */
    async addEmployee(local = "employee") {
      const email = `${local}@${domain}`;
      const employee = await json(admin, "POST", "/api/employees", { name: "Temp Employee", email, dept: "General Support", active: true });
      return acceptInvite(employee.inviteUrl, email, password);
    },
    remove: () => json(owner, "DELETE", `/api/platform/tenants/${org.id}`, { confirm: name }),
  };
}

let passed = 0;
let failed = 0;

export async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed++;
    console.log(`  ✗ ${name}\n      ${(error as Error).message.split("\n").join("\n      ")}`);
  }
}

/** Prints the tally and exits non-zero when any check failed. */
export function finish() {
  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed) process.exit(1);
}

export function run(main: () => Promise<void>) {
  main().then(finish, (error) => {
    console.error(error);
    process.exit(1);
  });
}
