import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupView } from "@/features/auth/SignupView";
import { getSessionUser } from "@/server/auth";
import { departmentNames } from "@/server/domain/directory";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  if (await getSessionUser()) redirect("/");
  // Read on the server so the public page needs no unauthenticated API.
  return <SignupView departments={await departmentNames()} />;
}
