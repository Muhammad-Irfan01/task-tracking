import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cn("skeleton", className)} style={style} />;
}

export function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-2 py-4">
      <Skeleton className="h-9 w-9 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-2/5 rounded" />
        <Skeleton className="h-3 w-1/4 rounded" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
      <Skeleton className="hidden h-3.5 w-14 rounded sm:block" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="surface space-y-3 rounded-2xl p-5 shadow-soft">
      <Skeleton className="h-3.5 w-1/3 rounded" />
      <Skeleton className="h-7 w-1/2 rounded" />
      <Skeleton className="h-3 w-1/4 rounded" />
    </div>
  );
}

export function CardGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }, (_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 240 }: { height?: number }) {
  return <Skeleton className="w-full rounded-xl" style={{ height }} />;
}
