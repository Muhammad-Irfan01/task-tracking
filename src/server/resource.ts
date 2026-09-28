import type { z } from "zod";
import { toFieldErrors, type FieldErrors } from "@/lib/schemas";
import { isForeignKeyViolation, isUniqueViolation, violatedColumn } from "./db/errors";
import { conflict, invalid, notFound } from "./errors";

type AnyObjectSchema = z.ZodObject<z.ZodRawShape>;

export interface ResourceConfig<V, S extends AnyObjectSchema> {
  /** Singular display name used in messages, e.g. "Department". */
  entity: string;
  schema: S;
  list: () => Promise<V[]>;
  get: (id: number) => Promise<V | undefined>;
  /** Inserts a validated record and returns its id. Throw `invalid()` for bad references. */
  insert: (input: z.infer<S>) => Promise<number>;
  /** Applies a validated partial update; resolves false if the row doesn't exist. */
  update: (id: number, changes: Partial<z.infer<S>>) => Promise<boolean>;
  /** Return a reason to refuse deletion (e.g. still referenced). */
  deleteBlocker?: (id: number) => Promise<string | null>;
  remove: (id: number) => Promise<boolean>;
  /** Maps unique-constraint columns to form fields (defaults to the same name). */
  uniqueFields?: Record<string, string>;
}

export function parseId(raw: string | number) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parse<T>(schema: z.ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) throw invalid(toFieldErrors(result.error));
  return result.data;
}

/** Validated CRUD around async data-access callbacks, with uniform DB error handling. */
export function createResource<V, S extends AnyObjectSchema>(config: ResourceConfig<V, S>) {
  const { entity } = config;
  const noun = entity.toLowerCase();

  async function get(rawId: string | number) {
    const id = parseId(rawId);
    const item = id ? await config.get(id) : undefined;
    if (!item) throw notFound(entity);
    return item;
  }

  /** Converts constraint violations into friendly 422/409 responses. */
  async function guard<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (isUniqueViolation(error)) {
        const column = violatedColumn(error) ?? "name";
        const field = config.uniqueFields?.[column] ?? column;
        const article = /^[aeiou]/.test(noun) ? "An" : "A";
        throw invalid({ [field]: `${article} ${noun} with this ${field} already exists` } as FieldErrors);
      }
      if (isForeignKeyViolation(error)) {
        throw conflict(`This ${noun} is still referenced by other records.`);
      }
      throw error;
    }
  }

  return {
    entity,
    list: () => config.list(),
    get,

    async create(raw: unknown) {
      const input = parse(config.schema, raw) as z.infer<S>;
      const id = await guard(() => config.insert(input));
      return get(id);
    },

    async update(rawId: string | number, raw: unknown) {
      const id = parseId(rawId);
      if (!id) throw notFound(entity);
      const changes = parse(config.schema.partial(), raw) as Partial<z.infer<S>>;
      const found = await guard(() => config.update(id, changes));
      if (!found) throw notFound(entity);
      return get(id);
    },

    async remove(rawId: string | number) {
      const id = parseId(rawId);
      if (!id || !(await config.get(id))) throw notFound(entity);
      const reason = await config.deleteBlocker?.(id);
      if (reason) throw conflict(reason);
      await guard(() => config.remove(id));
      return { id };
    },
  };
}

export type Resource<V> = ReturnType<typeof createResource<V, AnyObjectSchema>>;

/** Collects "unknown reference" errors so all of them are reported at once. */
export class References {
  readonly errors: FieldErrors = {};

  async resolve<T>(field: string, value: string | undefined, lookup: (value: string) => Promise<T | undefined>, message: string) {
    if (value === undefined) return undefined;
    const found = await lookup(value);
    if (found === undefined) this.errors[field] = message;
    return found;
  }

  assert() {
    if (Object.keys(this.errors).length > 0) throw invalid(this.errors);
  }
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
