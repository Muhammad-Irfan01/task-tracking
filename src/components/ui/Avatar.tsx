import { cn, initials } from "@/lib/utils";

const SIZES = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
};

interface AvatarProps {
  name: string;
  color?: string;
  size?: keyof typeof SIZES;
  className?: string;
}

export function Avatar({ name, color = "bg-brand-500", size = "md", className }: AvatarProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        color,
        SIZES[size],
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
