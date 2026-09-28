import { useCallback, useState, type ChangeEvent, type FormEvent } from "react";
import type { z } from "zod";
import { toFieldErrors, type FieldErrors } from "@/lib/schemas";
import { errorMessage, fieldErrors } from "@/services/api-client";
import { toast } from "@/store/toast.store";

type FieldElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/**
 * Minimal form state bound to a zod schema: validates on submit, surfaces
 * server-side field errors (422) on the same fields, and tracks submission.
 */
export function useZodForm<S extends z.ZodType<Record<string, unknown>>>(schema: S, initial: z.input<S>) {
  const [values, setValues] = useState<z.input<S>>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const set = useCallback(<K extends keyof z.input<S> & string>(key: K, value: z.input<S>[K]) => {
    setValues((current) => ({ ...(current as Record<string, unknown>), [key]: value }) as z.input<S>);
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, []);

  /** Props for a text-like <Input>/<Select>/<Textarea>. */
  function field<K extends keyof z.input<S> & string>(key: K, { numeric = false } = {}) {
    const value = values[key];
    return {
      name: key,
      value: value === undefined || value === null || (typeof value === "number" && Number.isNaN(value)) ? "" : String(value),
      error: errors[key],
      onChange: (event: ChangeEvent<FieldElement>) => {
        const raw = event.target.value;
        set(key, (numeric ? (raw === "" ? Number.NaN : Number(raw)) : raw) as z.input<S>[K]);
      },
    };
  }

  function handleSubmit(onValid: (data: z.output<S>) => Promise<void> | void) {
    return async (event?: FormEvent) => {
      event?.preventDefault();
      const result = schema.safeParse(values);
      if (!result.success) {
        setErrors(toFieldErrors(result.error));
        return;
      }
      setSubmitting(true);
      try {
        await onValid(result.data);
      } catch (error) {
        setErrors(fieldErrors(error));
        toast.error(errorMessage(error));
      } finally {
        setSubmitting(false);
      }
    };
  }

  return { values, errors, submitting, set, field, handleSubmit, reset: setValues, setErrors };
}
