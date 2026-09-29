import { and, desc, eq, ilike, or } from "drizzle-orm";
import type { SearchResults } from "@/types";
import { db } from "../db";
import { articles, customers, departments, faqCategories, organizations, staff, tickets } from "../db/schema";
import { ticketNumber } from "../db/seed/people";
import { inTenant } from "../tenant";

const LIMIT = 5;

/** Escapes LIKE wildcards so user input is matched literally. */
const pattern = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export async function search(rawQuery: string): Promise<SearchResults> {
  const q = rawQuery.trim();
  if (q.length < 2) return { tickets: [], customers: [], agents: [], articles: [] };
  const like = pattern(q);
  // Ticket numbers look like RD008842; match on the numeric id too.
  const numeric = Number(q.replace(/^rd0*/i, ""));

  const [ticketRows, customerRows, agentRows, articleRows] = await Promise.all([
    db
      .select({ id: tickets.id, subject: tickets.subject, status: tickets.status })
      .from(tickets)
      .innerJoin(customers, eq(customers.id, tickets.customerId))
      .where(
        and(
          inTenant(tickets.tenantId),
          or(ilike(tickets.subject, like), ilike(customers.name, like), ...(Number.isInteger(numeric) && numeric > 0 ? [eq(tickets.id, numeric)] : [])),
        ),
      )
      .orderBy(desc(tickets.updatedAt))
      .limit(LIMIT),
    db
      .select({ id: customers.id, name: customers.name, email: customers.email })
      .from(customers)
      .innerJoin(organizations, eq(organizations.id, customers.organizationId))
      .where(and(inTenant(customers.tenantId), or(ilike(customers.name, like), ilike(customers.email, like), ilike(organizations.name, like))))
      .limit(LIMIT),
    db
      .select({ id: staff.id, name: staff.name, dept: departments.name })
      .from(staff)
      .innerJoin(departments, eq(departments.id, staff.departmentId))
      .where(and(inTenant(staff.tenantId), or(ilike(staff.name, like), ilike(staff.email, like), ilike(departments.name, like))))
      .limit(LIMIT),
    db
      .select({ id: articles.id, question: articles.question, category: faqCategories.name })
      .from(articles)
      .innerJoin(faqCategories, eq(faqCategories.id, articles.categoryId))
      .where(and(inTenant(articles.tenantId), or(ilike(articles.question, like), ilike(faqCategories.name, like))))
      .limit(LIMIT),
  ]);

  return {
    tickets: ticketRows.map((t) => ({ ...t, number: ticketNumber(t.id) })),
    customers: customerRows,
    agents: agentRows,
    articles: articleRows,
  };
}
