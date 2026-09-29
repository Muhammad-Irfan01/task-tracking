import { and, asc, eq, sql, type SQL } from "drizzle-orm";
import { articleSchema, cannedResponseSchema, faqCategorySchema } from "@/lib/schemas";
import type { CannedResponse, FaqArticle, FaqCategory } from "@/types";
import { db } from "../db";
import { articles as articlesTable, cannedResponses as cannedTable, departments, faqCategories } from "../db/schema";
import { notFound } from "../errors";
import { createResource, parseId, plural, References } from "../resource";
import { currentTenant, inTenant } from "../tenant";
import { categoryIdByName, count, countSql, departmentIdByName, q } from "./shared";

async function exists(table: typeof faqCategories | typeof articlesTable | typeof cannedTable, id: number) {
  return (await db.select({ id: table.id }).from(table).where(and(eq(table.id, id), inTenant(table.tenantId)))).length > 0;
}

// ---------------------------------------------------------------- categories

async function categoryRows(where?: SQL): Promise<FaqCategory[]> {
  return db
    .select({
      id: faqCategories.id,
      name: faqCategories.name,
      count: sql<number>`(select count(*)::int from ${articlesTable} where ${q(articlesTable.categoryId)} = ${q(faqCategories.id)})`,
    })
    .from(faqCategories)
    .where(and(inTenant(faqCategories.tenantId), where))
    .orderBy(asc(faqCategories.id));
}

export const categories = createResource({
  entity: "Category",
  schema: faqCategorySchema,
  list: () => categoryRows(),
  get: async (id) => (await categoryRows(eq(faqCategories.id, id)))[0],
  insert: async (input) => (await db.insert(faqCategories).values({ ...input, tenantId: currentTenant() }).returning({ id: faqCategories.id }))[0].id,
  update: async (id, changes) =>
    Object.keys(changes).length === 0
      ? exists(faqCategories, id)
      : (await db.update(faqCategories).set(changes).where(and(eq(faqCategories.id, id), inTenant(faqCategories.tenantId))).returning()).length > 0,
  deleteBlocker: async (id) => {
    const total = await count(db.select({ n: countSql }).from(articlesTable).where(eq(articlesTable.categoryId, id)));
    return total ? `This category still has ${plural(total, "article")}.` : null;
  },
  remove: async (id) => (await db.delete(faqCategories).where(and(eq(faqCategories.id, id), inTenant(faqCategories.tenantId))).returning()).length > 0,
});

// ---------------------------------------------------------------- articles

async function articleRows(where?: SQL): Promise<FaqArticle[]> {
  return db
    .select({
      id: articlesTable.id,
      category: faqCategories.name,
      question: articlesTable.question,
      answer: articlesTable.answer,
      published: articlesTable.published,
      views: articlesTable.views,
    })
    .from(articlesTable)
    .innerJoin(faqCategories, eq(faqCategories.id, articlesTable.categoryId))
    .where(and(inTenant(articlesTable.tenantId), where))
    .orderBy(asc(articlesTable.id));
}

async function resolveCategory(name: string | undefined) {
  const refs = new References();
  const categoryId = await refs.resolve("category", name, categoryIdByName, "Unknown category");
  refs.assert();
  return categoryId;
}

export const articles = createResource({
  entity: "Article",
  schema: articleSchema,
  list: () => articleRows(),
  get: async (id) => (await articleRows(eq(articlesTable.id, id)))[0],
  insert: async ({ category, ...input }) => {
    const categoryId = (await resolveCategory(category))!;
    return (await db.insert(articlesTable).values({ ...input, categoryId, tenantId: currentTenant() }).returning({ id: articlesTable.id }))[0].id;
  },
  update: async (id, { category, ...changes }) => {
    const categoryId = await resolveCategory(category);
    const set = { ...changes, ...(categoryId ? { categoryId } : {}) };
    return Object.keys(set).length === 0
      ? exists(articlesTable, id)
      : (await db.update(articlesTable).set(set).where(and(eq(articlesTable.id, id), inTenant(articlesTable.tenantId))).returning()).length > 0;
  },
  remove: async (id) => (await db.delete(articlesTable).where(and(eq(articlesTable.id, id), inTenant(articlesTable.tenantId))).returning()).length > 0,
});

/** Atomic increment, safe under concurrent readers. */
export async function recordArticleView(rawId: string) {
  const id = parseId(rawId);
  const updated = id
    ? await db
        .update(articlesTable)
        .set({ views: sql`${articlesTable.views} + 1` })
        .where(and(eq(articlesTable.id, id), inTenant(articlesTable.tenantId)))
        .returning({ id: articlesTable.id })
    : [];
  if (!updated.length) throw notFound("Article");
  return articles.get(updated[0].id);
}

// ---------------------------------------------------------------- canned responses

async function cannedRows(where?: SQL): Promise<CannedResponse[]> {
  return db
    .select({
      id: cannedTable.id,
      title: cannedTable.title,
      dept: departments.name,
      enabled: cannedTable.enabled,
      body: cannedTable.body,
    })
    .from(cannedTable)
    .innerJoin(departments, eq(departments.id, cannedTable.departmentId))
    .where(and(inTenant(cannedTable.tenantId), where))
    .orderBy(asc(cannedTable.id));
}

async function resolveDept(name: string | undefined) {
  const refs = new References();
  const departmentId = await refs.resolve("dept", name, departmentIdByName, "Unknown department");
  refs.assert();
  return departmentId;
}

export const cannedResponses = createResource({
  entity: "Canned response",
  schema: cannedResponseSchema,
  list: () => cannedRows(),
  get: async (id) => (await cannedRows(eq(cannedTable.id, id)))[0],
  insert: async ({ dept, ...input }) => {
    const departmentId = (await resolveDept(dept))!;
    return (await db.insert(cannedTable).values({ ...input, departmentId, tenantId: currentTenant() }).returning({ id: cannedTable.id }))[0].id;
  },
  update: async (id, { dept, ...changes }) => {
    const departmentId = await resolveDept(dept);
    const set = { ...changes, ...(departmentId ? { departmentId } : {}) };
    return Object.keys(set).length === 0
      ? exists(cannedTable, id)
      : (await db.update(cannedTable).set(set).where(and(eq(cannedTable.id, id), inTenant(cannedTable.tenantId))).returning()).length > 0;
  },
  remove: async (id) => (await db.delete(cannedTable).where(and(eq(cannedTable.id, id), inTenant(cannedTable.tenantId))).returning()).length > 0,
});
