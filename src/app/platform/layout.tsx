import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PlatformShell } from "@/features/platform/PlatformShell";
import { getPlatformUser, getSessionUser } from "@/server/auth";

export const metadata: Metadata = { title: { default: "Platform", template: "%s · Platform · Threadline" } };

export default async function PlatformLayout({ children }: LayoutProps<"/platform">) {
  const user = await getPlatformUser();
  if (!user) redirect((await getSessionUser()) ? "/" : "/login?next=/platform");
  return <PlatformShell user={user}>{children}</PlatformShell>;
}
