# Threadline — Support Desk

A multi-organization help-desk platform (tickets, customers, agents, SLAs, knowledge base, reports).

## Who does what

| Role | Signs in and lands on | Can do |
| --- | --- | --- |
| **Super admin** (you, the platform owner) — from `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` | `/login` → `/platform` | Create client organizations with their first admin, set the plan (Small 75 / Medium 250 / Large 1000 employees), add more admins, re-send invites, suspend / reactivate / delete organizations. Can't see inside a desk. |
| **Organization admin** — invited by the super admin | `/login` → their desk | Everything inside their own organization: invite staff (Agents → Add Agent), departments, teams, SLA plans, help topics, settings |
| **Staff (agent)** — invited by their organization admin | `/login` → their desk | Tickets, customers, knowledge base, reports inside their organization |
| **Employee** — invited by their organization admin (Employees page) | `/login` → `/portal` | Raise tickets to a department (topics follow the department), reply with attachments, get notified of agent replies and status changes, mark resolved / reopen. Sees only their own tickets and never the desk |

Each organization is isolated: every table carries `tenant_id`, and every query runs inside the signed-in
user's organization (`src/server/tenant.ts`); a query without one throws instead of returning other
organizations' data. Emails are unique across the platform, so the email alone decides where someone signs in.
Each organization has a **staff email domain** (e.g. `acme.com`, set by the super admin): every admin and agent
must use `name@acme.com`, a domain belongs to one organization only, and public providers (gmail.com, …) are refused.
Organizations created before domains existed have none (any email) until one is set.
There is no public sign-up. See `docs/PRODUCTION_TESTING.md` for the full test plan.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · Zustand · Axios · Zod · Drizzle ORM · Postgres (Neon / PGlite) · Motion · Recharts · lucide-react

```bash
npm install
npm run dev      # http://localhost:3000 — migrates + seeds a local database first
npm run build && npm start
```

## Database

Postgres via [Drizzle ORM](https://orm.drizzle.team). Two drivers, same schema and queries:

| Where | Driver | Setup |
| --- | --- | --- |
| Local (no `DATABASE_URL`) | **PGlite** — real Postgres compiled to WASM, stored in `./.data` | none |
| Vercel / anywhere with `DATABASE_URL` | **Neon** serverless (HTTP) | add Neon from the Vercel dashboard |

| Command | What it does |
| --- | --- |
| `npm run db:setup` | Apply migrations; load demo data only if the database is empty (runs automatically before `dev` and `build`) |
| `npm run db:reset` | Drop everything, re-migrate, reseed fresh demo data (demo timestamps are relative to seed time) |
| `npm run db:seed -- --force` | Replace all data with fresh demo data |
| `npm run db:clean -- --force` | **Delete all data** — every organization, demo or real — keeping only the super admin from `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` |
| `npm run db:generate` | After editing `src/server/db/schema.ts`, write a new SQL migration into `./drizzle` (commit it) |
| `npm run db:studio` | Browse the data in Drizzle Studio |

PGlite is single-process: stop `npm run dev` before running `db:*` commands against the local database.

## Deploy to Vercel (free)

1. Push the repo to GitHub and import it in Vercel.
2. In the project, open **Storage → Create → Neon** (free tier) and connect it to the project.
   This sets `DATABASE_URL` for Production, Preview and Development.
3. Under **Settings → Environment Variables** add `SESSION_SECRET` (`openssl rand -base64 32`) and,
   optionally, `APP_URL`.
4. Also add `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` (8+ characters, a letter and a number) and optionally
   `SUPER_ADMIN_NAME`. Use an email that isn't an agent in any organization.
5. Deploy. The build runs migrations and creates (or updates) the super admin. An empty **production** database
   gets no demo data (set `SEED_DEMO=1` if you want it); sign in as the super admin and create your first
   organization at `/platform`. Preview deployments and local dev get demo data.

**Upgrading an existing single-desk deployment:** the `0002_multi_tenancy` migration moves all existing data into
organization #1 (named after its workspace settings), so current users keep working. Set the `SUPER_ADMIN_*`
variables before deploying. `ADMIN_EMAIL` / `ADMIN_PASSWORD` are no longer used — delete them.

**Already deployed with demo data?** The demo accounts share the public password `threadline`, so clear them:
either delete the demo organization from `/platform`, or wipe everything — copy the database connection string
(Vercel → Storage → your Neon database → `.env.local` tab) into your local `.env.local` as `DATABASE_URL=…`, run
`npm run db:clean -- --force` and **redeploy** so the build recreates the super admin from Vercel's `SUPER_ADMIN_*`. **Remove `DATABASE_URL` from `.env.local` afterwards** — while it's there,
`npm run dev` works against the production database.

Notes: enable Neon's *preview branches* in the integration so preview deployments get their own database copy
instead of migrating production. For real email, either set `SMTP_USER` (a Gmail address) and `SMTP_PASS` (a
[Google App Password](https://myaccount.google.com/apppasswords)) — free, no domain needed — or add a
[Resend](https://resend.com) API key and a sender on a verified domain (`RESEND_API_KEY`, `MAIL_FROM`). For bigger attachments, add a **Blob** store (Storage → Blob, private access) —
Vercel sets `BLOB_READ_WRITE_TOKEN` and replies switch to direct browser uploads (25 MB per file, 100 MB per reply).
Without it, attachments are stored in Postgres (`bytea`) and capped at 4 MB per reply by Vercel's 4.5 MB request
body limit. Existing attachments keep working either way. To work against
the Neon database locally: `vercel env pull .env.local`.

**Demo sign-ins** (local and preview; password `threadline` for all):

| Email | Who |
| --- | --- |
| `owner@threadline.io` | Super admin → `/platform` (only when `SUPER_ADMIN_*` isn't set) |
| `amara.chen@threadline.io` | Admin of *Threadline Support Desk* (the big demo organization) |
| `layla.haddad@threadline.io` | Regular agent in *Threadline Support Desk* |
| `nadia@northwind.test` | Admin of *Northwind Traders* (a small second organization, for checking isolation) |

Copy `.env.example` to `.env.local` to configure these locally.

| Env var | Purpose |
| --- | --- |
| `SESSION_SECRET` | HMAC key for session cookies — **required in production** |
| `APP_URL` | Base URL used in emailed links (e.g. `https://desk.example.com`). Links never use the request Host header, which prevents reset-link poisoning |
| `SMTP_USER`, `SMTP_PASS` | Send email over SMTP with Nodemailer (Gmail by default; `SMTP_PASS` is an App Password). Optional `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` for other providers. Used before Resend when set |
| `RESEND_API_KEY`, `MAIL_FROM` | Send password-reset and invite emails through Resend. `MAIL_FROM` must use a domain verified in Resend (e.g. `Threadline <support@desk.example.com>`). Unset: emails are only written to the server log |
| `BLOB_READ_WRITE_TOKEN` | Private Vercel Blob store for reply attachments (set automatically when you connect a Blob store). Unset: attachments go in Postgres, 4 MB per reply |
| `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `SUPER_ADMIN_NAME` | The platform owner account, created or updated on every build — **required in production**. Change the password here and redeploy to rotate it |
| `SEED_DEMO` | Set to `1` to load demo data into an empty production database |

## What's live

- **Platform console** (`/platform`) — organizations with a plan — Small (up to 75 active employees), Medium (250) or
  Large (1000), enforced when adding or reactivating people, and a downgrade below the current headcount is
  refused — plus status and usage; add admins; re-send invites. If an invite email can't be sent, the console shows the
  link so you can pass it on. Suspending an organization signs everyone in it out immediately.
- **Account lifecycle** — invite (`/reset-password?token=…`), forgot password (`/forgot-password`), and reset.
  Reset tokens are random, single-use, expire in 30 minutes, and only their SHA-256 hash is stored; requesting a
  new one revokes the old. The forgot-password response is identical whether or not the email exists. A successful
  reset signs out all other sessions and signs the user in. Agents created by an admin get an **invite** email
  (72-hour link) to set their first password. Login, forgot and reset are rate-limited.
  Email goes over SMTP (Nodemailer) when `SMTP_USER` / `SMTP_PASS` are set, else through Resend when
  `RESEND_API_KEY` / `MAIL_FROM` are set; otherwise `src/server/mail.ts` prints
  messages to the server log (and in `npm run dev` the forgot-password screen shows the link directly). If an
  invite can't be sent, the admin is told so instead of seeing a false "emailed" confirmation.
- **Auth** — signed, httpOnly session cookie; `src/proxy.ts` gates every page and API route, the dashboard
  layout verifies the session server-side (so every page renders dynamically per request). Changing your
  password signs out your other sessions. Admin-only: managing agents and workspace settings.
- **Full CRUD** — customers, organizations, agents, departments, teams, SLA plans, help topics,
  knowledge-base articles & categories, canned responses. Validation is shared (zod) between forms and API.
  Records reference each other by foreign key, so renames show up everywhere instantly; deletes that would
  orphan data are refused with an explanation. Names are unique case-insensitively.
- **Tickets** — create (auto-assigned to the least-loaded available agent in the department, SLA due time
  from the help topic's plan), reassign / re-route / change status & priority, replies with file
  attachments (≤5 files; 4 MB per reply in Postgres, or 25 MB per file / 100 MB per reply with Vercel Blob), canned-response insertion, delete. Filters are shareable via URL
  (`/tickets?overdue=1`, `?assignee=…`, `?department=…`, `?status=…`).
- **Computed data** — every count, SLA breach, and dashboard/report metric (volume, first response,
  resolution time, first-contact resolution, CSAT, leaderboard) is calculated from ticket data for the
  selected range, compared with the previous period.
- **Notifications** — assignment, reply, and live SLA-breach notifications, polled every 30 s; respects
  per-user preferences.
- **Global search** — tickets, customers, agents, and articles with keyboard navigation.

## Structure

```
src/
  app/
    (dashboard)/         # every page shares the sidebar + header shell
      layout.tsx         # AppShell
      template.tsx       # per-navigation page fade-in
      tickets/[id]/…     # thin route files → feature views
    api/                 # route handlers (mock REST API)
    layout.tsx           # fonts, theme init script, providers
    not-found.tsx
  features/<domain>/     # page-level client views
  components/
    ui/                  # Button, Card, Badge, fields, Table, Pagination, Skeleton, StatCard, Tabs…
    layout/              # AppShell, Sidebar, Header, UserMenu, ThemeToggle, ThemeSync
    charts/              # recharts: volume, priority breakdown, department load
    motion/              # FadeIn (staggered entrance), Collapse (accordion)
    feedback/            # Toaster
  features/forms/        # create/edit modals for each entity
  services/              # axios client, generic REST resource service, per-domain services
  store/                 # Zustand: CRUD collection stores, tickets, reports, notifications,
                         #   session (per-request, via context), confirm dialog, theme, toasts
  hooks/                 # useZodForm, useEntityDialog, useCollection, useReport, …
  server/
    db/                  # Drizzle schema, client (Neon | PGlite), deterministic demo seed
    domain/              # business logic: tickets, directory, content, reports, notifications…
    resource.ts          # generic validated CRUD: zod parsing, DB constraint → field errors, delete guards
    auth.ts, http.ts     # sessions, route wrappers
  proxy.ts               # auth gate
drizzle/                 # SQL migrations (generated, committed)
scripts/db.ts            # migrate / seed / setup / reset CLI
  lib/                   # zod schemas, constants, formatting, navigation
  types/
```

## Data flow

`View → Zustand store → service (axios) → /api route handler → server/db`

After any mutation, every loaded store refetches (`store/registry.ts`), so derived numbers stay consistent
across pages.

All state — including rate limits, reset tokens, notifications and attachments — lives in Postgres, so it
survives restarts and is shared across serverless instances.

## Animations (ported from the original build)

- Spring `layoutId` pill on the active sidebar item (also used for Settings tabs and knowledge-base category chips)
- Mobile nav drawer slide-in with backdrop fade (Esc to close)
- Toast stack enter/exit
- Stat cards and list items fade-and-rise with stagger; ticket conversation reveal
- `pulse-ring` on Emergency priority dots; shimmer skeletons
- Button press scale, chevron rotations, accordion height reveal, theme-icon swap, page fade on navigation
- Respects `prefers-reduced-motion`
