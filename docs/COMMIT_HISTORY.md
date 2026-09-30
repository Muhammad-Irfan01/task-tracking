# Commit History

Oldest first. To see the full diff of any commit, run `git show <hash>`.

| # | Date | Commit | Summary | Size |
| --- | --- | --- | --- | --- |
| 1 | 2026-09-26 | `6f096d7` | **Initial commit from Create Next App** — empty Next.js starter | 19 files, +6,651 |
| 2 | 2026-09-28 | `355563c` | **first commit** — first project files added | 50 files, +168 |
| 3 | 2026-09-28 | `cb413ee` | **first commit** — the Threadline support desk: tickets, customers, agents, departments, teams, SLA plans, help topics, knowledge base, canned responses, reports, settings | 218 files, +18,615 / −3,919 |
| 4 | 2026-09-28 | `61facc1` | **remove some unnecessary files** — cleans up files from commit 2 | 50 files, +1 / −168 |
| 5 | 2026-09-28 | `e5d5694` | **Merge branch 'main' of github.com:Muhammad-Irfan01/task-tracking** — syncs local and GitHub | 1 file, +1 |
| 6 | 2026-09-28 | `bfe162a` | **remove empty folder** | 1 file, −1 |
| 7 | 2026-09-28 | `e324262` | **update db** — Postgres with Drizzle ORM (Neon on Vercel, PGlite locally), migrations and demo seed | 20 files, +2,196 / −60 |
| 8 | 2026-09-28 | `fb058c8` | **Start production databases clean and add db:clean** — production gets no demo data; `db:clean` wipes to a fresh admin | 4 files, +95 / −4 |
| 9 | 2026-09-28 | `b6f1951` | **Send email over SMTP with Nodemailer** — Gmail/SMTP for reset and invite emails | 5 files, +93 / −16 |
| 10 | 2026-09-28 | `99246f4` | **Refuse to run sessions on Vercel without a real SESSION_SECRET** | 1 file, +18 / −3 |
| 11 | 2026-09-28 | `80dff3e` | **vercel setup** | 1 file, +1 |
| 12 | 2026-09-29 | `6160f17` | **Turn the desk into a multi-organization platform** — see below | 54 files, +6,051 / −404 |
| 13 | 2026-09-29 | `94d904f` | **Add a commit history document** — this file | 1 file, +35 |
| 14 | 2026-09-29 | `9d71bde` | **Warn instead of failing the build when SUPER_ADMIN_EMAIL is an agent** | 1 file, +5 / −1 |
| 15 | 2026-09-29 | `0acc5d5` | **Ignore stray whitespace around SUPER_ADMIN_PASSWORD** — trims pasted line breaks and warns | 1 file, +5 / −1 |
| 16 | 2026-09-29 | `e98573a` | **Give each organization a staff email domain** — agents' emails must be @ the org's domain | 18 files, +2,200 / −29 |
| 17 | 2026-09-29 | `88b6926` | **Replace seat limits with Small / Medium / Large plans** — 75 / 250 / 1,000 employees | 17 files, +2,141 / −96 |
| 18 | 2026-09-29 | `4c7805e` | **Add an employee request portal** — see below | 52 files, +3,725 / −284 |
| 19 | 2026-09-29 | `25a837c` | **Add a progress document** — `docs/PROGRESS.md`: what's built and what remains | 1 file, +127 |
| 20 | 2026-09-30 | `15d448f` | **Let each organization upload its own logo** — see below | 15 files, +2,264 / −10 |
| 21 | 2026-09-30 | `d8d1cb3` | **Bring the commit history up to date through the logo feature** — this file | 1 file, +26 |
| 22 | 2026-09-30 | `05b5bc3` | **Add a plain-language testing guide** — `docs/TESTING_GUIDE_SIMPLE.md` for non-technical testers | 3 files, +261 / −6 |
| 23 | 2026-09-30 | `a7ecd88` | **Complete the employee portal** — see below | 32 files, +3,029 / −197 |

## 12 · Multi-organization platform (`6160f17`, branch `multi-tenant-platform`)

- **Super admin and `/platform` console:** create client organizations with their first admin; set plan and seat
  limit; add admins; resend invites; suspend, reactivate or delete an organization. The login comes from
  `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`.
- **Data isolation:** every organization-owned table has `tenant_id`, and every query is limited to the signed-in
  user's organization (`src/server/tenant.ts`). Names are unique per organization; emails are unique across the platform.
- **Staff onboarding:** org admins invite their staff, and public `/signup` is removed. The seat limit is
  enforced, and suspended organizations are signed out.
- **Migrations:** `0002_multi_tenancy` moves existing data into organization #1, and `0003_drop_org_settings` drops the old
  settings table (settings now live on each organization).
- **Docs:** `docs/PRODUCTION_TESTING.md` (step-by-step test plan) and README updates.

## 18 · Employee request portal (`4c7805e`)

- **Employees** are a new kind of user, invited by their org admin from the Employees page. They sign in to
  `/portal`, never the desk.
- **In the portal:** raise tickets to a department (help topics follow the department), reply with attachments,
  get notified of agent replies and status changes, and mark tickets resolved or reopen them. Employees only see
  their own tickets.
- **Migration:** `0006_employee_portal` adds `staff.kind` and links an employee to their customer record.

## 20 · Organization logos (`15d448f`)

- **Upload:** org admins add, replace or remove their company logo under **Settings → Organization**
  (PNG, JPEG, WebP or GIF, up to 512 KB; SVG is refused because it can carry scripts).
- **Where it shows:** the organization's desk sidebar and employee portal header. Other organizations, the login
  page and the platform console keep the default Threadline logo.
- **Isolation:** `/api/settings/organization/logo` always serves the signed-in user's own organization's logo.
- **Migration:** `0007_tenant_logo` adds `logo`, `logo_type` and `logo_updated_at` to `tenants`.

## 23 · Employee portal completed (`a7ecd88`)

- **Internal notes:** agents switch the reply box to *Internal note*. Employees never receive notes: not in the
  conversation, the message count, attachments or notifications. A note doesn't count as a first response.
- **Email updates:** employees are emailed when an agent replies or changes a ticket's status (with a link to the
  ticket); they can turn this off under **Account**.
- **Attachments on new tickets:** files picked on the New ticket form are added to the ticket's opening message.
- **Help center (`/portal/help`):** the organization's published knowledge base articles, searchable; matching
  articles are suggested while typing a ticket subject.
- **Satisfaction rating:** 1–5 stars and an optional comment once a ticket is resolved; agents see it on the ticket
  and are notified; reopening clears it.
- **Migration:** `0008_portal_completion` adds `messages.is_internal`, `tickets.rating_comment` and
  `user_preferences.email_updates`.

---

To refresh this file later: `git log --reverse --date=short --pretty=format:'%h | %ad | %s'`
