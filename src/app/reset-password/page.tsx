import type { Metadata } from "next";
import { ResetPasswordView } from "@/features/auth/ResetPasswordView";
import { inspectResetToken } from "@/server/auth";

export const metadata: Metadata = {
  title: "Reset password",
  // Tokens live in the URL: keep them out of Referer headers and search indexes.
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

/** Deliberately reachable while signed in, so an emailed link always works. */
export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";
  return <ResetPasswordView token={value} state={await inspectResetToken(value || undefined)} />;
}
