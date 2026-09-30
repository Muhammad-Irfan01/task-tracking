# Project Progress — Threadline Task Tracking Platform

_Last updated: 2026-09-30 · Employee portal completed (internal notes, email updates, attachments on new tickets, help center, ratings) and organization logos_

## Summary

| | |
| --- | --- |
| **Requested scope** | ✅ **Built:** multi-organization platform, super admin, org admins, staff, email domains, plans, and the employee portal |
| **Production readiness** | 🟡 **Mostly there.** Works end to end, but the gaps in "What remains" should be closed before selling widely |
| **Live URL** | https://task-tracking-flax.vercel.app |
| **Test plans** | `docs/TESTING_GUIDE_SIMPLE.md` (plain language, for non-technical testers) · `docs/PRODUCTION_TESTING.md` (full technical plan) |
| **Commit log** | `docs/COMMIT_HISTORY.md` |

Rough estimate: **about 75–80% of a sellable product.** All the core flows you asked for are done. What's left is
mostly billing, notifications by email, a few safety and convenience features, and automated tests.

---

## ✅ What is built

### 1. Platform (super admin) — `/platform`
| Feature | Status |
| --- | --- |
| Super admin account from `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` (created or updated on every deploy) | ✅ |
| Create an organization with its first admin (invite email, or a copyable link when email fails) | ✅ |
| Organization list: domain, plan, employees used, ticket counts, status | ✅ |
| Edit an organization: name, support email, email domain, plan, time zone | ✅ |
| Add more admins, re-send invites | ✅ |
| Suspend / reactivate (signs everyone in that org out immediately) | ✅ |
| Delete an organization with all its data (you must type the name to confirm) | ✅ |

### 2. Organizations, isolation and plans
| Feature | Status |
| --- | --- |
| Every organization's data is separated (`tenant_id` on every table; unscoped queries fail) | ✅ |
| Staff email domain per organization (`name@acme.com`), one domain per org, public providers refused | ✅ |
| Plans: **Small 75 · Medium 250 · Large 1000** active employees; enforced on add/reactivate; unsafe downgrades refused | ✅ |
| Existing data moved into organization #1 during the upgrade | ✅ |

### 3. Help desk (org admins and agents)
| Feature | Status |
| --- | --- |
| Tickets: create, auto-assign to the least-busy agent, SLA due times, status and priority, reassign, delete | ✅ |
| Replies with attachments (Postgres, or Vercel Blob for large files) and canned responses | ✅ |
| **Internal notes** on a ticket (only agents see them; they don't count as a first response) | ✅ |
| Organization **logo** uploaded by the org admin, shown in that org's desk and portal | ✅ |
| Customers, organizations (customer companies), departments, teams, SLA plans, help topics | ✅ |
| Knowledge base (categories and articles), canned responses | ✅ |
| Dashboard and reports (7 / 30 / 90 days), overdue tracking, global search | ✅ |
| In-app notifications (assignment, reply, SLA breach) | ✅ |
| **Agents** page (admins invite staff) and **Employees** page (admins invite portal users) | ✅ |
| Settings: profile, password, notification preferences, organization details | ✅ |

### 4. Employee request portal — `/portal`
| Feature | Status |
| --- | --- |
| Employees sign in and see only **My tickets** (Open / Resolved / All, search) | ✅ |
| **New ticket:** department → that department's topics, priority, subject, details, **attachments** | ✅ |
| **Suggested help articles** while typing the subject of a new ticket | ✅ |
| **Help center** (`/portal/help`): the organization's published knowledge base, searchable by category | ✅ |
| Ticket page: conversation, replies with attachments, **Mark resolved** / **Reopen** | ✅ |
| **Satisfaction rating** (1–5 stars + optional comment) once resolved; can be changed; cleared on reopen; agents see it | ✅ |
| Notified when an agent replies or changes the status — in the portal and **by email** (can be turned off under Account) | ✅ |
| Account: name, email (within the domain), email updates on/off, password | ✅ |
| Agents' **internal notes** are never sent to the portal (messages, counts, files, notifications) | ✅ |
| Kept out of the desk (pages redirect, APIs refuse); can't see other employees' tickets or files | ✅ |

### 5. Accounts and security
| Feature | Status |
| --- | --- |
| Invite-only sign-up (no public sign-up) | ✅ |
| Forgot / reset password (single-use links, 30 min), invites (72 h) | ✅ |
| Signed session cookies; a password change signs out other sessions | ✅ |
| Rate limits on login, forgot and reset | ✅ |
| Email over SMTP (Gmail) or Resend | ✅ |

### 6. Deployment
| Item | Status |
| --- | --- |
| Vercel + Neon Postgres; migrations run on every deploy | ✅ |
| Production super admin: `bilal.amjad135@yahoo.com` | ✅ |
| Employee portal deployed (commit `4c7805e`, build Ready, migrations applied, `/portal` live) | ✅ |
| README, `.env.example`, testing guide, commit history | ✅ |

---

## 🔲 What remains

### High priority (before selling to customers)
| # | Item | Why it matters |
| --- | --- | --- |
| 2 | **Email notifications for agents** (new ticket, employee reply) | Employees now get emails for replies and status changes; agents still only get in-app notifications. |
| 3 | **Billing for plans** (e.g. Stripe subscriptions, invoices, trial / expiry) | Plans are set by hand by the super admin; nothing charges customers or stops an unpaid organization. |
| 4 | **Automated tests** (API isolation tests, main UI flows) | Everything was tested with scripted checks during development, but there's no test suite that runs on each change. |
| 5 | **Visual check of the new screens** in a real browser (console, Employees page, portal, help center, ratings, internal notes, logo upload) | Checked by server rendering and API, not visually; the browser extension wasn't connected. Follow Parts 2–4 and 6b of the testing guide. |
| 6 | **Give your existing "Support Desk" organization an email domain** | Its admin uses `@gmail.com`, so a domain can't be set yet; move its people to company emails first. |

### Medium priority
| # | Item |
| --- | --- |
| 10 | Org admins can re-send invites from the desk (today only the super admin console can, or the link is in the server log) |
| 11 | Ticket numbers per organization (today they're shared across the platform, so an org sees gaps) |
| 12 | Audit log (who changed what: plans, suspensions, deletions, role changes) |
| 13 | More than one super admin, and a super admin password change without redeploying |
| 14 | Super admin "view as organization" for support, with an audit trail |

### Nice to have
| # | Item |
| --- | --- |
| 15 | Email-to-ticket (send an email to the support address and it becomes a ticket) |
| 16 | Real-time updates (WebSockets) instead of polling every 20–30 s |
| 17 | Custom subdomain per organization (e.g. `acme.yourapp.com`) and brand colors (logos are done) |
| 18 | Data export per organization; configurable plan limits instead of fixed 75 / 250 / 1000 |
| 19 | SLA business hours and holidays, escalation rules |
| 20 | Remove the personal `prefix=` line from the committed `.npmrc` (it makes every Vercel build print harmless "npm error config prefix" lines) |

---

## Change timeline

| Date | Commit | What changed |
| --- | --- | --- |
| 2026-09-28 | `cb413ee` … `80dff3e` | Single help desk, Postgres, SMTP email, Vercel setup |
| 2026-09-29 | `6160f17` | Multi-organization platform + super admin console |
| 2026-09-29 | `9d71bde`, `0acc5d5` | Deployment fixes for the super admin account |
| 2026-09-29 | `e98573a` | Staff email domain per organization |
| 2026-09-29 | `88b6926` | Small / Medium / Large plans |
| 2026-09-29 | `4c7805e` | Employee request portal |
| 2026-09-30 | `15d448f` | Organization logos |
| 2026-09-30 | `a7ecd88` | Portal completed: internal notes, employee emails, attachments on new tickets, help center, ratings |
