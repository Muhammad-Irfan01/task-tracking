import { cn } from "@/lib/utils";

const LEVELS = [
  { label: "Too weak", className: "bg-rose-500" },
  { label: "Weak", className: "bg-rose-500" },
  { label: "Fair", className: "bg-amber-500" },
  { label: "Good", className: "bg-emerald-500" },
  { label: "Strong", className: "bg-emerald-500" },
];

/** Rough strength estimate for feedback only; the zod policy is what's enforced. */
function score(password: string) {
  let points = 0;
  if (password.length >= 8) points++;
  if (password.length >= 12) points++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points++;
  if (/[0-9]/.test(password)) points++;
  if (/[^a-zA-Z0-9]/.test(password)) points++;
  return Math.min(4, password.length < 8 ? Math.min(points, 1) : points);
}

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const level = score(password);
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1">
        {Array.from({ length: 4 }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              i < level ? LEVELS[level].className : "bg-ink-900/10 dark:bg-paper-100/10",
            )}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-ink-900/45 dark:text-paper-100/45">{LEVELS[level].label}</p>
    </div>
  );
}
