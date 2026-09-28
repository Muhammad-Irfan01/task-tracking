import { ChevronDown } from "lucide-react";
import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

const CONTROL =
  "w-full rounded-lg border bg-white dark:bg-ink-800 text-sm text-ink-900 dark:text-paper-100 placeholder:text-ink-900/35 dark:placeholder:text-paper-100/30 transition-colors focus:outline-hidden focus:ring-2 focus:ring-brand-500/20";

function controlBorder(error?: string) {
  return error
    ? "border-rose-400 focus:border-rose-500"
    : "border-ink-900/10 dark:border-paper-100/10 focus:border-brand-500";
}

function fieldId(id?: string, label?: string) {
  return id ?? label?.toLowerCase().replace(/\s+/g, "-");
}

interface FieldProps {
  id?: string;
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

function Field({ id, label, error, hint, children }: FieldProps) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-paper-100/80">
          {label}
        </label>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-rose-500">
          {error}
        </p>
      )}
      {hint && !error && <p className="mt-1.5 text-xs text-ink-900/40 dark:text-paper-100/40">{hint}</p>}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className, id, ...props },
  ref,
) {
  const inputId = fieldId(id, label);
  return (
    <Field id={inputId} label={label} error={error} hint={hint}>
      <input
        id={inputId}
        ref={ref}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={cn(CONTROL, "px-3.5 py-2.5", controlBorder(error), className)}
        {...props}
      />
    </Field>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className, id, rows = 4, ...props },
  ref,
) {
  const inputId = fieldId(id, label);
  return (
    <Field id={inputId} label={label} error={error}>
      <textarea
        id={inputId}
        ref={ref}
        rows={rows}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={cn(CONTROL, "resize-none px-3.5 py-2.5", controlBorder(error), className)}
        {...props}
      />
    </Field>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, className, id, children, ...props },
  ref,
) {
  const inputId = fieldId(id, label);
  return (
    <Field id={inputId} label={label} error={error}>
      <div className="relative">
        <select
          id={inputId}
          ref={ref}
          className={cn(CONTROL, "appearance-none py-2.5 pl-3.5 pr-9", controlBorder(error), className)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-900/40 dark:text-paper-100/40" />
      </div>
    </Field>
  );
});
