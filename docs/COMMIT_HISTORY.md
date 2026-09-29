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

---

To refresh this file later: `git log --reverse --date=short --pretty=format:'%h | %ad | %s'`
