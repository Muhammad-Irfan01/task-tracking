import type { Metadata } from "next";
import { SettingsView } from "@/features/settings/SettingsView";
import { SETTINGS_TABS, type SettingsTab } from "@/features/settings/tabs";

export const metadata: Metadata = { title: "Settings" };

export default async function Page({ searchParams }: PageProps<"/settings">) {
  const { tab } = await searchParams;
  const initialTab = (SETTINGS_TABS as readonly string[]).includes(String(tab)) ? (tab as SettingsTab) : "General";
  return <SettingsView key={initialTab} initialTab={initialTab} />;
}
