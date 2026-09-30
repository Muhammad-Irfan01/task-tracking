/**
 * End-to-end check that each organization sees and changes only its own logo.
 *
 *   npm run test:logo            (needs `npm run dev` running; BASE_URL overrides http://localhost:3000)
 *
 * Uses the local demo data (Threadline org, password "threadline") plus a temporary second
 * organization created through the platform console. The demo org's logo is restored and the
 * temporary organization deleted afterwards, even when a check fails.
 */
import assert from "node:assert/strict";
import { anonymous, call, check, createTempOrg, json, login, run, type Session } from "./e2e";

const LOGO = "/api/settings/organization/logo";

/** Bytes the server accepts as PNG, tagged so each organization's logo is distinguishable. */
const fakePng = (tag: string) => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from(tag)]);

const upload = (session: Session, data: Buffer, type = "image/png") =>
  call(session, LOGO, { method: "PUT", headers: { "content-type": type }, body: new Uint8Array(data) });

async function fetchLogo(session: Session, query = "") {
  const res = await call(session, LOGO + query);
  return { status: res.status, body: res.ok ? Buffer.from(await res.arrayBuffer()) : null };
}

async function main() {
  const stamp = Date.now();

  // Organization A: the demo Threadline org.
  const adminA = await login("amara.chen@threadline.io");
  const agentA = await login("priya.nair@threadline.io"); // not an admin

  // Organization B: created fresh through the platform console, with a portal employee.
  const orgB = await createTempOrg("Logo Isolation Test");
  const adminB = orgB.admin;
  const employeeB = await orgB.addEmployee();

  // Keep organization A's current logo so it can be put back.
  const originalA = await fetchLogo(adminA);
  const originalAType = originalA.body ? (await call(adminA, LOGO)).headers.get("content-type")! : null;

  const logoA = fakePng(`org-a-${stamp}`);
  const logoB = fakePng(`org-b-${stamp}`);

  console.log(`\nLogo isolation: "${orgB.name}" (org B) vs the demo org (org A)\n`);
  try {
    await check("org B starts with no logo", async () => {
      assert.equal((await fetchLogo(adminB)).status, 404);
    });

    await check("org A admin uploads org A's logo", async () => {
      assert.equal((await upload(adminA, logoA)).status, 200);
      assert.deepEqual((await fetchLogo(adminA)).body, logoA);
    });

    await check("org B still has no logo after org A uploads", async () => {
      assert.equal((await fetchLogo(adminB)).status, 404);
    });

    await check("org B admin uploads org B's logo", async () => {
      assert.equal((await upload(adminB, logoB)).status, 200);
      assert.deepEqual((await fetchLogo(adminB)).body, logoB);
    });

    await check("org A still sees its own logo, not org B's", async () => {
      assert.deepEqual((await fetchLogo(adminA)).body, logoA);
      assert.deepEqual((await fetchLogo(agentA)).body, logoA);
    });

    await check("org B's portal employee sees org B's logo, not org A's", async () => {
      assert.deepEqual((await fetchLogo(employeeB)).body, logoB);
      assert.deepEqual((await fetchLogo(employeeB, `?tenantId=1`)).body, logoB);
    });

    await check("org A cannot reach org B's logo via query parameters", async () => {
      for (const q of [`?tenantId=${orgB.id}`, `?tenant=${orgB.id}`, `?id=${orgB.id}`, `?v=0&tenantId=${orgB.id}`]) {
        assert.deepEqual((await fetchLogo(adminA, q)).body, logoA, `query ${q} leaked`);
      }
    });

    await check("org settings report each org's own logo URL", async () => {
      const a = await json(adminA, "GET", "/api/settings/organization");
      const b = await json(adminB, "GET", "/api/settings/organization");
      assert.ok(a.logoUrl && b.logoUrl);
      assert.notEqual(a.logoUrl, b.logoUrl);
    });

    await check("non-admin agent in org A cannot change the logo", async () => {
      assert.equal((await upload(agentA, fakePng("hijack"))).status, 403);
      assert.equal((await call(agentA, LOGO, { method: "DELETE" })).status, 403);
      assert.deepEqual((await fetchLogo(adminA)).body, logoA);
    });

    await check("portal employee cannot change their org's logo", async () => {
      assert.equal((await upload(employeeB, fakePng("hijack"))).status, 403);
      assert.equal((await call(employeeB, LOGO, { method: "DELETE" })).status, 403);
      assert.deepEqual((await fetchLogo(adminB)).body, logoB);
    });

    await check("signed-out visitors cannot see any logo", async () => {
      assert.equal((await fetchLogo(anonymous)).status, 401);
    });

    await check("SVG and non-image uploads are rejected", async () => {
      const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
      assert.equal((await upload(adminA, svg, "image/svg+xml")).status, 400);
      assert.equal((await upload(adminA, svg, "image/png")).status, 400);
      assert.deepEqual((await fetchLogo(adminA)).body, logoA);
    });

    await check("org B removing its logo leaves org A's in place", async () => {
      assert.equal((await call(adminB, LOGO, { method: "DELETE" })).status, 200);
      assert.equal((await fetchLogo(adminB)).status, 404);
      assert.deepEqual((await fetchLogo(adminA)).body, logoA);
    });
  } finally {
    if (originalA.body) await upload(adminA, originalA.body, originalAType!);
    else await call(adminA, LOGO, { method: "DELETE" });
    await orgB.remove();
    console.log(`\n  cleanup: org A logo restored, "${orgB.name}" deleted`);
  }
}

run(main);
