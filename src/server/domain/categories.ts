import { and, asc, eq, sql, type SQL } from "drizzle-orm";
import { ticketCategorySchema, ticketSubcategorySchema } from "@/lib/schemas";
import type { TicketCategoryEntry, TicketSubcategoryEntry } from "@/types";
import { db } from "../db";
import { departments, ticketCategories, ticketSubcategories, tickets } from "../db/schema";
import { invalid } from "../errors";
import { createResource } from "../resource";
import { currentTenant, inTenant } from "../tenant";
import { countTickets, departmentIdByName, q } from "./shared";

/**
 * Ticket categories and sub-categories, managed by admins on the Ticket
 * Categories page. Deleting one keeps its tickets; they just lose the category.
 */

async function subcategoryRows(where?: SQL): Promise<TicketSubcategoryEntry[]> {
  return db
    .select({
      id: ticketSubcategories.id,
      categoryId: ticketSubcategories.categoryId,
      name: ticketSubcategories.name,
      tickets: countTickets(sql`${q(tickets.subcategoryId)} = ${q(ticketSubcategories.id)}`),
    })
    .from(ticketSubcategories)
    .where(and(inTenant(ticketSubcategories.tenantId), where))
    .orderBy(asc(ticketSubcategories.id));
}

async function categoryRows(where?: SQL): Promise<TicketCategoryEntry[]> {
  const [rows, subcategories] = await Promise.all([
    db
      .select({
        id: ticketCategories.id,
        name: ticketCategories.name,
        department: departments.name,
        tickets: countTickets(sql`${q(tickets.categoryId)} = ${q(ticketCategories.id)}`),
      })
      .from(ticketCategories)
      .innerJoin(departments, eq(departments.id, ticketCategories.departmentId))
      .where(and(inTenant(ticketCategories.tenantId), where))
      .orderBy(asc(ticketCategories.id)),
    subcategoryRows(),
  ]);
  return rows.map((row) => ({ ...row, subcategories: subcategories.filter((s) => s.categoryId === row.id) }));
}

const categoryWhere = (id: number) => and(eq(ticketCategories.id, id), inTenant(ticketCategories.tenantId));
const subcategoryWhere = (id: number) => and(eq(ticketSubcategories.id, id), inTenant(ticketSubcategories.tenantId));

export const ticketCategoriesResource = createResource({
  entity: "Category",
  schema: ticketCategorySchema,
  list: () => categoryRows(),
  get: async (id) => (await categoryRows(eq(ticketCategories.id, id)))[0],
  insert: async ({ department, name }) => {
    const departmentId = await departmentIdByName(department);
    if (!departmentId) throw invalid({ department: "Unknown department" });
    const [row] = await db.insert(ticketCategories).values({ tenantId: currentTenant(), departmentId, name }).returning({ id: ticketCategories.id });
    return row.id;
  },
  update: async (id, { department, name }) => {
    const [current] = await categoryRows(eq(ticketCategories.id, id));
    if (!current) return false;
    // Its tickets are in this department, so moving it would mislabel them.
    if (department !== undefined && department !== current.department) {
      throw invalid({ department: "A category can't move to another department — add it there instead" });
    }
    if (name !== undefined) await db.update(ticketCategories).set({ name }).where(categoryWhere(id));
    return true;
  },
  remove: async (id) => (await db.delete(ticketCategories).where(categoryWhere(id)).returning({ id: ticketCategories.id })).length > 0,
  uniqueFields: { department_id: "name" },
});

export const ticketSubcategoriesResource = createResource({
  entity: "Sub-category",
  schema: ticketSubcategorySchema,
  list: () => subcategoryRows(),
  get: async (id) => (await subcategoryRows(eq(ticketSubcategories.id, id)))[0],
  insert: async ({ categoryId, name }) => {
    const [category] = await db.select({ id: ticketCategories.id }).from(ticketCategories).where(categoryWhere(categoryId));
    if (!category) throw invalid({ categoryId: "Unknown category" });
    const [row] = await db.insert(ticketSubcategories).values({ tenantId: currentTenant(), categoryId, name }).returning({ id: ticketSubcategories.id });
    return row.id;
  },
  update: async (id, { categoryId, name }) => {
    const [current] = await subcategoryRows(eq(ticketSubcategories.id, id));
    if (!current) return false;
    if (categoryId !== undefined && categoryId !== current.categoryId) {
      throw invalid({ categoryId: "A sub-category can't move to another category — add it there instead" });
    }
    if (name !== undefined) await db.update(ticketSubcategories).set({ name }).where(subcategoryWhere(id));
    return true;
  },
  remove: async (id) => (await db.delete(ticketSubcategories).where(subcategoryWhere(id)).returning({ id: ticketSubcategories.id })).length > 0,
  uniqueFields: { category_id: "name" },
});
