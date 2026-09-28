import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder = "Search…", className }: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-900/35 dark:text-paper-100/35" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-lg border border-ink-900/10 bg-white py-2.5 pl-9 pr-3.5 text-sm text-ink-900 transition-colors placeholder:text-ink-900/35 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-paper-100/10 dark:bg-ink-800 dark:text-paper-100 dark:placeholder:text-paper-100/30"
      />
    </div>
  );
}
