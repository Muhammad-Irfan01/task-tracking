interface PgErrorShape {
  code?: string;
  constraint?: string;
  constraint_name?: string;
  detail?: string;
  cause?: unknown;
}

/** Drizzle wraps driver errors; walk the cause chain to find the Postgres error. */
export function pgError(error: unknown): PgErrorShape | null {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth++) {
    const candidate = current as PgErrorShape;
    if (typeof candidate.code === "string" && /^[0-9A-Z]{5}$/.test(candidate.code)) return candidate;
    current = candidate.cause;
  }
  return null;
}

export const isUniqueViolation = (error: unknown) => pgError(error)?.code === "23505";
export const isForeignKeyViolation = (error: unknown) => pgError(error)?.code === "23503";

/** Column behind a unique violation: from `Key (email)=…` in the detail, else "<table>_<column>_unique". */
export function violatedColumn(error: unknown) {
  const pg = pgError(error);
  // Detail looks like `Key (email)=(x)` or, for expression indexes, `Key (lower(name))=(x)`.
  const fromDetail = pg?.detail?.match(/Key \((?:lower\()?([a-z_]+)/)?.[1];
  const constraint = pg?.constraint ?? pg?.constraint_name;
  return fromDetail ?? constraint?.match(/_([a-z]+)(?:_lower)?_unique$/)?.[1];
}
