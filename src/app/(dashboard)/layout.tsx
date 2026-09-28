import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { getSessionUser } from "@/server/auth";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <SessionProvider user={user}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
