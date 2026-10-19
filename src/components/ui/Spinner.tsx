import { cn } from "@/lib/utils";

/** Small ring spinner that inherits the surrounding text color. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent", className)}
    />
  );
}
