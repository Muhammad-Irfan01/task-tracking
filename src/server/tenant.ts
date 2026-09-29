import { AsyncLocalStorage } from "node:async_hooks";
import { eq, type Column } from "drizzle-orm";

/**
 * The tenant (client organization) the current request acts for. Route
 * handlers and server pages enter it from the signed-in agent's session, so
 * domain code never takes a tenant argument and can't forget to pass one.
 */
const storage = new AsyncLocalStorage<number>();

export function withTenant<T>(tenantId: number, fn: () => T): T {
  return storage.run(tenantId, fn);
}

/** Throws outside a tenant scope, so an unscoped query fails loudly instead of leaking data. */
export function currentTenant(): number {
  const id = storage.getStore();
  if (id === undefined) throw new Error("No tenant in scope for this request");
  return id;
}

/** `table.tenant_id = <current tenant>` */
export const inTenant = (column: Column) => eq(column, currentTenant());
