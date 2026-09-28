import { APP_NAME } from "@/lib/constants";

export function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500">
        <svg viewBox="0 0 32 32" className="h-4 w-4" fill="none" aria-hidden>
          <path d="M8 12h16M8 16h11M8 20h13" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </div>
      <span className="font-display text-lg font-semibold tracking-tight text-ink-900 dark:text-paper-100">
        {APP_NAME}
      </span>
    </div>
  );
}
