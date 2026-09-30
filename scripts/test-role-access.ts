/**
 * End-to-end check of what organization admins and regular agents can see and change.
 *
 *   npm run test:access          (needs `npm run dev` running; BASE_URL overrides http://localhost:3000)
 *
 * Runs inside a temporary organization (an admin plus a regular agent) that is deleted afterwards.
 */
import assert from "node:assert/strict";
import { call, check, createTempOrg, json, run, send, type Session } from "./e2e";

/** Setup pages only admins see; `/organizations` is hidden from everyone. */
const ADMIN_PAGES = ["/staff", "/employees", "/departments", "/teams", "/sla", "/help-topics"];
const AGENT_PAGES = ["/", "/tickets", "/customers", "/knowledge-base", "/canned-responses", "/reports", "/settings"];
/** Setup data any agent may read (ticket screens use it) but only admins may change. */
const ADMIN_WRITE_APIS = ["/api/departments", "/api/teams", "/api/sla-plans", "/api/help-topics", "/api/organizations"];

async function page(session: Session, path: string) {
  const res = await call(session, path);
  return { status: res.status, location: res.headers.get("location"), html: res.ok ? await res.text() : "" };
}

function assertRedirectsHome(result: { status: number; location: string | null }, path: string) {
  assert.ok([303, 307, 308].includes(result.status), `${path}: expected a redirect, got ${result.status}`);
  assert.equal(new URL(result.location!, "http://x").pathname, "/", `${path}: redirected to ${result.location}`);
}

async function main() {
  const org = await createTempOrg("Role Access Test");
  const admin = org.admin;
  const agent = await org.addAgent();

  console.log(`\nRole access in "${org.name}"\n`);
  try {
    await check("admin can open every setup page", async () => {
      for (const path of ADMIN_PAGES) assert.equal((await page(admin, path)).status, 200, path);
    });

    await check("regular agent is sent to the dashboard from setup pages", async () => {
      for (const path of ADMIN_PAGES) assertRedirectsHome(await page(agent, path), path);
    });

    await check("regular agent can open every daily-work page", async () => {
      for (const path of AGENT_PAGES) assert.equal((await page(agent, path)).status, 200, path);
    });

    await check("Organizations page is hidden from admins and agents", async () => {
      assertRedirectsHome(await page(admin, "/organizations"), "admin /organizations");
      assertRedirectsHome(await page(agent, "/organizations"), "agent /organizations");
    });

    await check("sidebar shows setup links to admins only, and Organizations to nobody", async () => {
      const adminHtml = (await page(admin, "/")).html;
      const agentHtml = (await page(agent, "/")).html;
      for (const path of ADMIN_PAGES) {
        assert.ok(adminHtml.includes(`href="${path}"`), `admin sidebar is missing ${path}`);
        assert.ok(!agentHtml.includes(`href="${path}"`), `agent sidebar shows ${path}`);
      }
      for (const path of ["/tickets", "/knowledge-base", "/reports"]) assert.ok(agentHtml.includes(`href="${path}"`), `agent sidebar is missing ${path}`);
      assert.ok(!adminHtml.includes('href="/organizations"') && !agentHtml.includes('href="/organizations"'));
    });

    await check("regular agent can still read setup data", async () => {
      for (const path of ADMIN_WRITE_APIS) assert.equal((await call(agent, path)).status, 200, path);
    });

    await check("regular agent cannot create, edit or delete setup data", async () => {
      for (const path of ADMIN_WRITE_APIS) {
        assert.equal((await send(agent, "POST", path, {})).status, 403, `POST ${path}`);
        const [first] = await json(admin, "GET", path);
        if (!first) continue;
        assert.equal((await send(agent, "PATCH", `${path}/${first.id}`, first)).status, 403, `PATCH ${path}`);
        assert.equal((await send(agent, "DELETE", `${path}/${first.id}`)).status, 403, `DELETE ${path}`);
      }
    });

    await check("admin can still create, edit and delete setup data", async () => {
      const dept = await json(admin, "POST", "/api/departments", { name: "Access Test Dept", manager: "Temp Admin", isPublic: false });
      await json(admin, "PATCH", `/api/departments/${dept.id}`, { ...dept, isPublic: true });
      await json(admin, "DELETE", `/api/departments/${dept.id}`);
    });

    await check("regular agent cannot manage agents, employees or workspace settings", async () => {
      assert.equal((await send(agent, "POST", "/api/staff", {})).status, 403, "POST /api/staff");
      assert.equal((await send(agent, "POST", "/api/employees", {})).status, 403, "POST /api/employees");
      assert.equal((await send(agent, "PATCH", "/api/settings/organization", {})).status, 403, "PATCH settings");
    });
  } finally {
    await org.remove();
    console.log(`\n  cleanup: "${org.name}" deleted`);
  }
}

run(main);
