# How to Test Threadline — A Simple Guide

This guide is for anyone. You don't need any technical knowledge. You'll use the website like a real
customer would, follow the steps in order, and tick **Pass** or **Fail** for each one.

**Time needed:** about 1 hour
**Website:** https://task-tracking-flax.vercel.app

---

## What is this app?

Threadline is a help-desk website that we sell to companies ("organizations"). Inside each company:

- The **admin** sets things up and adds people.
- **Agents** are the helpers. They answer requests and fix problems.
- **Employees** ask for help. For example: "My laptop is broken" to IT, or "I need a leave letter" to HR.

Each request is called a **ticket**. Every company's tickets are private to that company.

The person who runs the whole website (the owner) is the **super admin**. They create the companies.

---

## Before you start

You need these five things:

| # | What | Where to get it |
| --- | --- | --- |
| 1 | The **super admin email and password** | Ask the project owner. Keep them private. |
| 2 | **Four email addresses you can open**, all ending with the **same company name**, e.g. `@gulfdesks.com` | Ask your IT team for four test mailboxes. Some email systems let you add a word after a `+` in your own address, e.g. `yourname+admin@gulfdesks.com`, `yourname+agent@gulfdesks.com`, `yourname+emp1@gulfdesks.com`, `yourname+emp2@gulfdesks.com` — all of them arrive in your normal inbox. Ask IT whether that works for you. |
| 3 | **Two web browsers**, e.g. Chrome and Microsoft Edge (or Chrome and Firefox) | Already on your computer |
| 4 | Your browser's **private window** (Chrome: Ctrl+Shift+N; Edge: Ctrl+Shift+N; Firefox: Ctrl+Shift+P) | — |
| 5 | This guide printed or open on a second screen | — |

> ⚠️ **Gmail, Yahoo or Hotmail addresses won't work** for the company people. The app only accepts
> company email addresses, on purpose.

> 💡 **Why several windows?** Each window can be signed in as a different person, so you can play the
> admin, the agent and the employee at the same time.

**Write your test details here:**

| | |
| --- | --- |
| Company domain (the part after @) | `@________________` |
| Admin email | |
| Agent email | |
| Employee 1 email | |
| Employee 2 email | |
| Your name / date | |

---

## Part 1 — Sign in as the super admin (5 minutes)

**Use:** Browser 1, normal window.

| Step | Do this | You should see | Pass / Fail |
| --- | --- | --- | --- |
| 1.1 | Go to https://task-tracking-flax.vercel.app | A **Sign in** page | ☐ Pass ☐ Fail |
| 1.2 | Type the super admin email and a **wrong** password, click **Sign in** | A red message: "Incorrect email or password" | ☐ Pass ☐ Fail |
| 1.3 | Type the **correct** password, click **Sign in** | A page called **Organizations** with a "Platform console" label at the top | ☐ Pass ☐ Fail |

---

## Part 2 — Create a test company (10 minutes)

**Use:** Browser 1 (still the super admin).

| Step | Do this | You should see | Pass / Fail |
| --- | --- | --- | --- |
| 2.1 | Click **New organization** | A form opens | ☐ Pass ☐ Fail |
| 2.2 | Without typing anything, click **Create organization** | Red messages under the empty boxes. Nothing is created | ☐ Pass ☐ Fail |
| 2.3 | In **Staff email domain** type `gmail.com` and click **Create organization** | A message saying to use the organization's own domain, not a public email provider | ☐ Pass ☐ Fail |
| 2.4 | Fill in the form properly: **Organization name:** `TEST Company` · **Support email:** your admin email · **Staff email domain:** your company domain (e.g. `gulfdesks.com`, without the @) · **Plan:** Small — up to 75 employees · **Admin name:** `Test Admin` · **Admin email:** your admin email | — | ☐ Pass ☐ Fail |
| 2.5 | Click **Create organization** | A box saying "Organization created" and that an invite was emailed | ☐ Pass ☐ Fail |
| 2.6 | Close the box | **TEST Company** is in the list, with Plan **Small**, Employees **1 / 75**, Status **Active** | ☐ Pass ☐ Fail |
| 2.7 | Click **TEST Company** | Its page opens. Under **People**, "Test Admin" shows as **Invited** | ☐ Pass ☐ Fail |

---

## Part 3 — Become the company admin (10 minutes)

**Use:** Browser 1, **private window** (keep the normal window open).

| Step | Do this | You should see | Pass / Fail |
| --- | --- | --- | --- |
| 3.1 | Open the **admin mailbox**. Find the email "…invited you to TEST Company on Threadline" (check Spam too) | The email has a link | ☐ Pass ☐ Fail |
| 3.2 | Copy the link and open it in the **private window** | A page to set your password | ☐ Pass ☐ Fail |
| 3.3 | Type a short password like `abc` | It's refused (needs 8+ characters with letters and numbers) | ☐ Pass ☐ Fail |
| 3.4 | Type a good password (e.g. `Testing2026`) twice, and save it | You're signed in and see the **Dashboard**, with **TEST Company** written under the logo on the left | ☐ Pass ☐ Fail |
| 3.5 | Click **Tickets**, then **Customers**, then **Agents** in the left menu | All empty or showing only "Test Admin". **You must not see any other company's data** | ☐ Pass ☐ Fail |
| 3.6 | Click **Settings** → **Organization** | "Plan: Small · 1 of 75 employees · Staff emails: @your-domain" | ☐ Pass ☐ Fail |
| 3.7 | Go back to **Browser 1 normal window**, refresh the TEST Company page | Test Admin now shows as **Active** | ☐ Pass ☐ Fail |

---

## Part 4 — Add an agent and two employees (10 minutes)

**Use:** Browser 1, private window (you are the **Test Admin**).

| Step | Do this | You should see | Pass / Fail |
| --- | --- | --- | --- |
| 4.1 | Left menu → **Agents** → **Add Agent**. Name `Test Agent`, email: a **gmail.com** address | Refused: "Use an @your-domain email address" | ☐ Pass ☐ Fail |
| 4.2 | Change the email to your **agent email**, Department **General Support**, Role **Agent**. Click **Save** | "Test Agent added — an invite … was emailed" | ☐ Pass ☐ Fail |
| 4.3 | Left menu → **Employees** → **Add Employee**. Name `Employee One`, your **employee 1 email**, any department. Save | Added. Shows as **Invited** | ☐ Pass ☐ Fail |
| 4.4 | Add another: `Employee Two`, your **employee 2 email**. Save | Added | ☐ Pass ☐ Fail |
| 4.5 | Look at the **Agents** page again | Only Test Admin and Test Agent, **not** the employees | ☐ Pass ☐ Fail |

**Now set up the agent** — use **Browser 2** (e.g. Edge), normal window:

| Step | Do this | You should see | Pass / Fail |
| --- | --- | --- | --- |
| 4.6 | Open the **agent mailbox**, open the invite link in Browser 2, set a password | Signed in, the **Dashboard** of TEST Company | ☐ Pass ☐ Fail |

---

## Part 5 — The employee asks for help (10 minutes)

**Use:** Browser 2, **private window** (keep the agent's normal window open).

| Step | Do this | You should see | Pass / Fail |
| --- | --- | --- | --- |
| 5.1 | Open the **employee 1** invite email ("…request portal…"), open the link in Browser 2's private window, set a password | A simple page: "Hi Employee, here are your tickets". **No left menu** | ☐ Pass ☐ Fail |
| 5.2 | Click **New ticket** | A form | ☐ Pass ☐ Fail |
| 5.3 | Change the **Department** box | The **Topic** box changes to that department's topics | ☐ Pass ☐ Fail |
| 5.4 | Department **General Support**, Topic **General Enquiry**, Subject `My laptop screen is flickering`, Priority **High**, Details `It started this morning.` Click **Submit ticket** | The ticket page opens: status **Open**, and "Test Admin is working on it" (new tickets go to the least-busy helper; the admin counts as one) | ☐ Pass ☐ Fail |
| 5.5 | Click **My tickets** at the top | The new ticket is in the list | ☐ Pass ☐ Fail |
| 5.6 | In the address bar, change the end of the web address to `/tickets` and press Enter | You're sent back to **My tickets**. Employees can't open the agents' area | ☐ Pass ☐ Fail |

---

## Part 6 — The agent answers (10 minutes)

**First, the admin passes the ticket to the agent.** Use Browser 1, private window (**Test Admin**):

| Step | Do this | You should see | Pass / Fail |
| --- | --- | --- | --- |
| 6.0a | Left menu → **Tickets** → open **My laptop screen is flickering** | Requester **Employee One**; Assigned to **Test Admin** | ☐ Pass ☐ Fail |
| 6.0b | On the right, change **Assigned to** to **Test Agent** and click **Save changes** | Assigned to **Test Agent** | ☐ Pass ☐ Fail |

**Now the agent.** Use Browser 2, normal window (**Test Agent**):

| Step | Do this | You should see | Pass / Fail |
| --- | --- | --- | --- |
| 6.1 | Click the **bell** icon at the top right | "…assigned to you" (it can take up to 30 seconds; refresh the page if needed) | ☐ Pass ☐ Fail |
| 6.2 | Left menu → **Tickets** → open **My laptop screen is flickering** | The ticket, with **Employee One** as the requester and their message | ☐ Pass ☐ Fail |
| 6.3 | In the reply box type `I'll bring you a new screen today.` Click **Send reply** | The reply appears in the conversation | ☐ Pass ☐ Fail |
| 6.4 | On the right, change **Status** to **On Hold** and click **Save changes** | Status shows **On Hold** | ☐ Pass ☐ Fail |

**Switch to the employee** — Browser 2, private window:

| Step | Do this | You should see | Pass / Fail |
| --- | --- | --- | --- |
| 6.5 | Open the ticket (or wait on it for 20 seconds) | The agent's reply with a **Support** label. Status **On Hold** | ☐ Pass ☐ Fail |
| 6.6 | Click the **bell** | "Test Agent replied on …" and "… is now On Hold". Clicking one opens the ticket | ☐ Pass ☐ Fail |

---

## Part 7 — The employee replies, closes and reopens (10 minutes)

**Use:** Browser 2, private window (you are **Employee One**).

| Step | Do this | You should see | Pass / Fail |
| --- | --- | --- | --- |
| 7.1 | Type `Thanks! Here is a photo.`, click **Attach files**, pick any small picture from your computer, click **Send** | Your message appears with a **You** label and the picture attached | ☐ Pass ☐ Fail |
| 7.2 | **Agent window:** open the ticket | The employee's message and picture are there. Clicking the picture opens it | ☐ Pass ☐ Fail |
| 7.3 | **Employee window:** click **Mark resolved** → confirm | Status **Resolved** | ☐ Pass ☐ Fail |
| 7.4 | **Agent window:** click the bell | "Employee One resolved …" | ☐ Pass ☐ Fail |
| 7.5 | **Employee window:** click **Reopen** | Status **Open** again, and the agent gets "…reopened…" | ☐ Pass ☐ Fail |

---

## Part 8 — Privacy checks (10 minutes)

These make sure people only see what they're allowed to see.

| Step | Do this | You should see | Pass / Fail |
| --- | --- | --- | --- |
| 8.1 | **Employee window:** open the ticket and **copy the web address** from the address bar | — | ☐ Pass ☐ Fail |
| 8.2 | Sign out (click your picture at the top right → **Sign out**). Open the **employee 2** invite email, set a password | "Hi Employee, here are your tickets" with **no tickets** | ☐ Pass ☐ Fail |
| 8.3 | Paste the address you copied in 8.1 and press Enter | **"Ticket not found"**. Employee Two can't see Employee One's ticket | ☐ Pass ☐ Fail |
| 8.4 | **Agent window:** in the address bar, go to the site address followed by `/portal` | You're sent back to the Dashboard (the employee page is only for employees) | ☐ Pass ☐ Fail |
| 8.5 | **Admin window** (Browser 1 private): **Employees** page | Employee One shows **1 open · 1 total** tickets | ☐ Pass ☐ Fail |

---

## Part 9 — Pause a company, then turn it back on (5 minutes)

| Step | Do this | You should see | Pass / Fail |
| --- | --- | --- | --- |
| 9.1 | **Super admin** (Browser 1 normal): open **TEST Company** → **Suspend** → confirm | Status **Suspended** | ☐ Pass ☐ Fail |
| 9.2 | In the **agent** or **employee** window, click anything | They're signed out and sent to Sign in | ☐ Pass ☐ Fail |
| 9.3 | Try to sign in as the agent | "Your organization's account is suspended. Contact your provider." | ☐ Pass ☐ Fail |
| 9.4 | **Super admin:** click **Reactivate** | Status **Active**. The agent can sign in again and everything is still there | ☐ Pass ☐ Fail |

---

## Part 10 — Clean up (3 minutes)

| Step | Do this | You should see | Pass / Fail |
| --- | --- | --- | --- |
| 10.1 | **Super admin:** open **TEST Company** → scroll down → **Delete organization** | A box asking you to type the name. The red button stays grey until you do | ☐ Pass ☐ Fail |
| 10.2 | Type `TEST Company` exactly, click **Delete forever** | Back on the list. TEST Company is gone | ☐ Pass ☐ Fail |
| 10.3 | Try to sign in as the test agent or employee | "Incorrect email or password" (the accounts were deleted) | ☐ Pass ☐ Fail |

> ⚠️ Only delete **TEST Company**. Never delete any other company in the list — that removes a real
> customer's data for good.

---

## If something goes wrong

1. **Don't worry — keep going** with the next part if you can.
2. Take a **screenshot** (Windows: press Windows + Shift + S; Mac: Cmd + Shift + 4).
3. Write it in the table below and send it to the project owner.

| Step number (e.g. 5.4) | What you did | What you expected | What happened instead | Time | Screenshot attached? |
| --- | --- | --- | --- | --- | --- |
| | | | | | |
| | | | | | |
| | | | | | |

### Common questions

| Problem | What to do |
| --- | --- |
| The invite email didn't arrive | Wait 2 minutes and check **Spam**. Still nothing? Ask the super admin to open the company, find the person under **People** and click **Resend invite** |
| "Too many attempts. Try again in N minutes" | You typed a wrong password many times. Wait the minutes shown, then try again |
| "This reset link is invalid or has expired" | Each link works once and expires (72 hours for invites). Ask for a new invite |
| I'm signed in as the wrong person | Click your picture at the top right → **Sign out**, or use another browser or private window |
| A page shows a spinner forever | Refresh the page once. If it still happens, report it with a screenshot |

---

## Final result

| Part | Pass / Fail |
| --- | --- |
| 1. Super admin sign-in | |
| 2. Create a company | |
| 3. Company admin | |
| 4. Add agent and employees | |
| 5. Employee asks for help | |
| 6. Agent answers | |
| 7. Employee replies, closes, reopens | |
| 8. Privacy checks | |
| 9. Suspend and reactivate | |
| 10. Clean up | |

**Tester name:** ______________________  **Date:** ____________  **Overall:** ☐ All passed ☐ Some failed
