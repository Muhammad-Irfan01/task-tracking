"use client";

import { useLinkStatus } from "next/link";
import { Spinner } from "./Spinner";

/** Spinner shown inside a `<Link>` while its navigation is pending. */
export function LinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return pending ? <Spinner className={className} /> : null;
}
