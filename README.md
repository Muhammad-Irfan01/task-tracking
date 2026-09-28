# Threadline — Support Desk

A Next.js rebuild of the Threadline support desk (tickets, customers, agents, SLAs, knowledge base, reports).

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
| `npm run db:generate` | After editing `src/server/db/schema.ts`, write a new SQL migration into `./drizzle` (commit it) |
| `npm run db:studio` | Browse the data in Drizzle Studio |

PGlite is single-process: stop `npm run dev` before running `db:*` commands against the local database.

## Deploy to Vercel (free)

1. Push the repo to GitHub and import it in Vercel.
2. In the project, open **Storage → Create → Neon** (free tier) and connect it to the project.
   This sets `DATABASE_URL` for Production, Preview and Development.
3. Under **Settings → Environment Variables** add `SESSION_SECRET` (`openssl rand -base64 32`) and,
   optionally, `APP_URL`.
4. Deploy. The build runs migrations and seeds demo data on the first deploy (set `SKIP_SEED=1` to start empty).

Notes: enable Neon's *preview branches* in the integration so preview deployments get their own database copy
instead of migrating production. Vercel caps request bodies at 4.5 MB, so reply attachments are limited to 4 MB
total and stored in Postgres (`bytea`) — move them to Vercel Blob or S3 if you need bigger files. To work against
the Neon database locally: `vercel env pull .env.local`.

**Sign in** with any seeded agent email and the demo password `threadline`
(e.g. `amara.chen@threadline.io` — an administrator; `layla.haddad@threadline.io` — a regular agent).
New people can also **create an account** at `/signup` (regular agent, not admin).

Copy `.env.example` to `.env.local` to configure these locally.

| Env var | Purpose |
| --- | --- |
| `SESSION_SECRET` | HMAC key for session cookies — **required in production** |
| `APP_URL` | Base URL used in emailed links (e.g. `https://desk.example.com`). Links never use the request Host header, which prevents reset-link poisoning |
| `SIGNUP_ALLOWED_DOMAINS` | Optional comma-separated list (e.g. `threadline.io`) restricting self-service sign-up |

## What's live

- **Account lifecycle** — sign-up (`/signup`), forgot password (`/forgot-password`), and reset (`/reset-password`).
  Reset tokens are random, single-use, expire in 30 minutes, and only their SHA-256 hash is stored; requesting a
  new one revokes the old. The forgot-password response is identical whether or not the email exists. A successful
  reset signs out all other sessions and signs the user in. Agents created by an admin get an **invite** email
  (72-hour link) to set their first password. Login, sign-up, forgot and reset are rate-limited.
  No email provider is configured: `src/server/mail.ts` prints messages to the server log (and in
  `npm run dev` the forgot-password screen shows the link directly) — replace it with Resend/SES/Postmark to send for real.
- **Auth** — signed, httpOnly session cookie; `src/proxy.ts` gates every page and API route, the dashboard
  layout verifies the session server-side (so every page renders dynamically per request). Changing your
  password signs out your other sessions. Admin-only: managing agents and workspace settings.
- **Full CRUD** — customers, organizations, agents, departments, teams, SLA plans, help topics,
  knowledge-base articles & categories, canned responses. Validation is shared (zod) between forms and API.
  Records reference each other by foreign key, so renames show up everywhere instantly; deletes that would
  orphan data are refused with an explanation. Names are unique case-insensitively.
- **Tickets** — create (auto-assigned to the least-loaded available agent in the department, SLA due time
  from the help topic's plan), reassign / re-route / change status & priority, replies with file
  attachments (≤5 files, 4 MB per reply), canned-response insertion, delete. Filters are shareable via URL
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
