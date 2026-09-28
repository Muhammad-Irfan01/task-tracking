import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("surface rounded-2xl shadow-soft", className)} {...props}>
      {children}
    </div>
  );
}
