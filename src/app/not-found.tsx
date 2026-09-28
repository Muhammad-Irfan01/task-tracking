import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { NotFoundView } from "@/features/not-found/NotFoundView";
import { getSessionUser } from "@/server/auth";

export const metadata: Metadata = { title: "Page not found" };

export default async function NotFound() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <main className="px-4">
        <NotFoundView />
      </main>
    );
  }
  return (
    <SessionProvider user={user}>
      <AppShell>
        <NotFoundView />
      </AppShell>
    </SessionProvider>
  );
}
