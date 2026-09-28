import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ForgotPasswordView } from "@/features/auth/ForgotPasswordView";
import { getSessionUser } from "@/server/auth";

export const metadata: Metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage({ searchParams }: PageProps<"/forgot-password">) {
  if (await getSessionUser()) redirect("/settings?tab=Security");
  const { email } = await searchParams;
  return <ForgotPasswordView initialEmail={typeof email === "string" ? email : ""} />;
}
