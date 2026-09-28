import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginView } from "@/features/auth/LoginView";
import { safeNext } from "@/lib/redirects";
import { getSessionUser } from "@/server/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getSessionUser()) redirect(next);
  return <LoginView next={next} notice={params.signedOut === "1" ? "You've been signed out." : undefined} />;
}
