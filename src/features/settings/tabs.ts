/** Plain module (not "use client") so the server page can validate ?tab= values. */
export const SETTINGS_TABS = ["General", "Notifications", "Security", "Organization"] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];
