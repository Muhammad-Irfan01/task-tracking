import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { PortalShell } from "@/features/portal/PortalShell";
import { getSessionUser } from "@/server/auth";

export const metadata: Metadata = { title: { default: "My tickets", template: "%s · Requests · Threadline" } };

export default async function PortalLayout({ children }: LayoutProps<"/portal">) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/portal");
  // Agents and admins work in the desk.
  if (user.kind !== "employee") redirect("/");

  return (
    <SessionProvider user={user}>
      <PortalShell>{children}</PortalShell>
    </SessionProvider>
  );
}
