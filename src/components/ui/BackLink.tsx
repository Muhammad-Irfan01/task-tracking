import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function BackLink({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1 text-sm text-ink-900/50 hover:text-brand-500 dark:text-paper-100/50",
        className,
      )}
    >
      <ChevronLeft className="h-4 w-4" /> {label}
    </Link>
  );
}
