import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  primary: "bg-brand-500 text-white hover:bg-brand-600 shadow-soft",
  secondary:
    "surface hover:bg-ink-900/[0.03] dark:hover:bg-paper-100/[0.06] text-ink-800 dark:text-paper-100",
  ghost: "text-ink-600 dark:text-paper-100/70 hover:bg-ink-900/[0.04] dark:hover:bg-paper-100/[0.06]",
  danger: "bg-rose-500 text-white hover:bg-rose-600 shadow-soft",
};

const SIZES = {
  sm: "px-3 py-1.5 text-sm rounded-lg gap-1.5",
  md: "px-4 py-2 text-sm rounded-xl gap-2",
  lg: "px-5 py-2.5 text-base rounded-xl gap-2",
  icon: "p-2 rounded-lg",
};

export interface ButtonStyleOptions {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  className?: string;
}

export function buttonClasses({ variant = "primary", size = "md", className }: ButtonStyleOptions = {}) {
  return cn(
    "inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, className })}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
      )}
      {children}
    </button>
  );
});
