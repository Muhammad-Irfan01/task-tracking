import { APP_NAME } from "@/lib/constants";

/**
 * The app mark, or — when `src` is given — an organization's own logo, so each
 * organization's agents and employees see their company's branding.
 */
export function Logo({ src, name }: { src?: string | null; name?: string }) {
  if (src) {
    return (
      <div className="flex h-8 items-center px-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- private, per-user image; not worth the optimizer */}
        <img src={src} alt={name ? `${name} logo` : "Organization logo"} className="h-8 max-w-44 object-contain object-left" />
      </div>
    );
  }
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
