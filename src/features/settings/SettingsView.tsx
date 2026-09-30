"use client";

import { Building, ImageUp, Lock, Moon, Sun, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ChangeEvent, type ComponentType } from "react";
import { useCurrentUser, useSession } from "@/components/providers/SessionProvider";
import { Button, Card, Input, PageHeader, Skeleton, Switch, Tabs } from "@/components/ui";
import { useZodForm } from "@/hooks/useZodForm";
import { ORG_LOGO, TIMEZONE_OPTIONS } from "@/lib/constants";
import { orgSettingsSchema, passwordSchema, profileSchema } from "@/lib/schemas";
import { accountService, errorMessage } from "@/services";
import { refreshLoadedStores, toast, useThemeStore } from "@/store";
import type { OrgSettings, UserPreferences } from "@/types";
import { SETTINGS_TABS, type SettingsTab } from "./tabs";


const PANEL = "flex items-center gap-3 rounded-xl bg-ink-900/[0.02] p-4 dark:bg-paper-100/[0.03]";

function GeneralTab() {
  const user = useCurrentUser();
  const setUser = useSession((state) => state.setUser);
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const form = useZodForm(profileSchema, { name: user.name, email: user.email });
  const dirty = form.values.name !== user.name || form.values.email !== user.email;

  const onSubmit = form.handleSubmit(async (input) => {
    const updated = await accountService.updateProfile(input);
    setUser(updated);
    // Renames cascade to tickets, teams and departments on the server.
    refreshLoadedStores();
    toast.success("Profile saved");
  });

  return (
    <div className="space-y-5">
      <div className={`${PANEL} justify-between`}>
        <div className="flex items-center gap-3">
          {theme === "dark" ? <Moon className="h-5 w-5 text-brand-500" /> : <Sun className="h-5 w-5 text-amber-500" />}
          <div>
            <p className="text-sm font-medium text-ink-900 dark:text-paper-100">Appearance</p>
            <p className="text-xs text-ink-900/50 dark:text-paper-100/50">Saved on this device</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={toggleTheme}>
          {theme === "dark" ? "Switch to light" : "Switch to dark"}
        </Button>
      </div>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <Input label="Display name" autoComplete="name" {...form.field("name")} />
        <Input label="Email address" type="email" autoComplete="email" hint="Used to sign in." {...form.field("email")} />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-ink-900/45 dark:text-paper-100/45">
            {user.role} · {user.dept}
          </p>
          <Button type="submit" loading={form.submitting} disabled={!dirty}>
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}

const PREFERENCE_LABELS: { key: keyof UserPreferences; label: string; description: string }[] = [
  { key: "assigned", label: "Ticket assigned to me", description: "When a new or existing ticket lands in your queue" },
  { key: "reply", label: "Replies on my tickets", description: "When a teammate replies on a ticket you own" },
  { key: "sla", label: "SLA breach warnings", description: "When one of your tickets passes its response deadline" },
  { key: "digest", label: "Weekly digest email", description: "A Monday summary of your queue and resolution stats" },
];

function NotificationsTab() {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [saving, setSaving] = useState<keyof UserPreferences | null>(null);

  useEffect(() => {
    accountService
      .preferences()
      .then(setPrefs)
      .catch((e) => toast.error(errorMessage(e)));
  }, []);

  async function toggle(key: keyof UserPreferences, value: boolean) {
    if (!prefs) return;
    const previous = prefs;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaving(key);
    try {
      setPrefs(await accountService.savePreferences(next));
      refreshLoadedStores();
      toast.success("Notification preferences saved");
    } catch (e) {
      setPrefs(previous);
      toast.error(errorMessage(e));
    } finally {
      setSaving(null);
    }
  }

  if (!prefs) {
    return (
      <div className="space-y-4">
        {PREFERENCE_LABELS.map((p) => (
          <Skeleton key={p.key} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {PREFERENCE_LABELS.map(({ key, label, description }) => (
        <div key={key} className={PANEL}>
          <Switch
            className="w-full"
            label={label}
            description={description}
            checked={prefs[key]}
            disabled={saving === key}
            onChange={(value) => toggle(key, value)}
          />
        </div>
      ))}
    </div>
  );
}

function SecurityTab() {
  const form = useZodForm(passwordSchema, { current: "", next: "", confirm: "" });

  const onSubmit = form.handleSubmit(async (input) => {
    await accountService.changePassword(input);
    form.reset({ current: "", next: "", confirm: "" });
    toast.success("Password updated — other sessions have been signed out");
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className={PANEL}>
        <Lock className="h-5 w-5 text-brand-500" />
        <p className="text-sm text-ink-900 dark:text-paper-100">
          Changing your password signs you out everywhere else.
        </p>
      </div>
      <Input label="Current password" type="password" autoComplete="current-password" {...form.field("current")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="New password" type="password" autoComplete="new-password" hint="At least 8 characters." {...form.field("next")} />
        <Input label="Confirm new password" type="password" autoComplete="new-password" {...form.field("confirm")} />
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={form.submitting}>
          Update password
        </Button>
      </div>
    </form>
  );
}

function OrganizationLogo({ settings, canEdit, onSaved }: { settings: OrgSettings; canEdit: boolean; onSaved: (s: OrgSettings) => void }) {
  const user = useCurrentUser();
  const setUser = useSession((state) => state.setUser);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);

  async function save(action: "upload" | "remove", request: () => Promise<OrgSettings>) {
    setBusy(action);
    try {
      const next = await request();
      onSaved(next);
      // The sidebar reads the logo from the session, so it updates right away.
      setUser({ ...user, tenantLogoUrl: next.logoUrl });
      toast.success(action === "upload" ? "Logo updated" : "Logo removed");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!(ORG_LOGO.types as readonly string[]).includes(file.type)) return toast.error("Logos must be PNG, JPEG, WebP or GIF images");
    if (file.size > ORG_LOGO.maxBytes) return toast.error(`Logos can be at most ${ORG_LOGO.maxBytes / 1024} KB`);
    save("upload", () => accountService.uploadOrgLogo(file));
  }

  return (
    <div className={`${PANEL} flex-wrap justify-between`}>
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-12 w-28 shrink-0 items-center justify-center rounded-lg border border-ink-900/[0.08] bg-white p-1.5 dark:border-paper-100/[0.08]">
          {settings.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- private, per-user image
            <img src={settings.logoUrl} alt={`${settings.name} logo`} className="max-h-full max-w-full object-contain" />
          ) : (
            <ImageUp className="h-5 w-5 text-ink-900/30" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-900 dark:text-paper-100">Company logo</p>
          <p className="text-xs text-ink-900/50 dark:text-paper-100/50">
            Shown to your agents and employees. PNG, JPEG, WebP or GIF, up to {ORG_LOGO.maxBytes / 1024} KB.
          </p>
        </div>
      </div>
      {canEdit && (
        <div className="flex items-center gap-2">
          <input ref={input} type="file" accept={ORG_LOGO.types.join(",")} className="hidden" onChange={onPick} />
          {settings.logoUrl && (
            <Button type="button" variant="secondary" size="sm" loading={busy === "remove"} disabled={busy !== null} onClick={() => save("remove", accountService.removeOrgLogo)}>
              <Trash2 className="h-4 w-4" /> Remove
            </Button>
          )}
          <Button type="button" variant="secondary" size="sm" loading={busy === "upload"} disabled={busy !== null} onClick={() => input.current?.click()}>
            <ImageUp className="h-4 w-4" /> {settings.logoUrl ? "Replace" : "Upload"}
          </Button>
        </div>
      )}
    </div>
  );
}

function OrganizationForm({ settings, canEdit, onSaved }: { settings: OrgSettings; canEdit: boolean; onSaved: (s: OrgSettings) => void }) {
  const form = useZodForm(orgSettingsSchema, {
    name: settings.name,
    supportEmail: settings.supportEmail,
    timezone: settings.timezone,
  });

  const onSubmit = form.handleSubmit(async (input) => {
    onSaved(await accountService.saveOrgSettings(input));
    toast.success("Workspace settings saved");
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className={PANEL}>
        <Building className="h-5 w-5 text-brand-500" />
        <div>
          <p className="text-sm font-medium text-ink-900 dark:text-paper-100">{settings.name}</p>
          <p className="text-xs text-ink-900/50 dark:text-paper-100/50">
            Plan: {settings.plan} · {settings.seatsUsed} of {settings.maxAgents} employees
            {settings.emailDomain ? ` · Staff emails: @${settings.emailDomain}` : ""}
          </p>
        </div>
      </div>
      <OrganizationLogo settings={settings} canEdit={canEdit} onSaved={onSaved} />
      <fieldset disabled={!canEdit} className="space-y-4 disabled:opacity-60">
        <Input label="Workspace name" {...form.field("name")} />
        <Input label="Support email" type="email" {...form.field("supportEmail")} />
        <Input label="Time zone" list="timezones" {...form.field("timezone")} />
        <datalist id="timezones">
          {TIMEZONE_OPTIONS.map((tz) => (
            <option key={tz} value={tz} />
          ))}
        </datalist>
      </fieldset>
      <div className="flex items-center justify-between gap-3">
        {!canEdit && <p className="text-xs text-ink-900/45 dark:text-paper-100/45">Only administrators can change workspace settings.</p>}
        <Button type="submit" loading={form.submitting} disabled={!canEdit} className="ml-auto">
          Save workspace
        </Button>
      </div>
    </form>
  );
}

function OrganizationTab() {
  const user = useCurrentUser();
  const [settings, setSettings] = useState<OrgSettings | null>(null);

  useEffect(() => {
    accountService
      .orgSettings()
      .then(setSettings)
      .catch((e) => toast.error(errorMessage(e)));
  }, []);

  if (!settings) return <Skeleton className="h-64 w-full rounded-xl" />;
  return <OrganizationForm key={settings.name} settings={settings} canEdit={user.isAdmin} onSaved={setSettings} />;
}

const PANELS: Record<SettingsTab, ComponentType> = {
  General: GeneralTab,
  Notifications: NotificationsTab,
  Security: SecurityTab,
  Organization: OrganizationTab,
};

export function SettingsView({ initialTab = "General" }: { initialTab?: SettingsTab }) {
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const Panel = PANELS[tab];

  // Keep the URL in sync so tabs are linkable (e.g. from the account menu).
  function changeTab(next: SettingsTab) {
    setTab(next);
    window.history.replaceState(null, "", `/settings?tab=${next}`);
  }

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Settings" description="Manage your profile and workspace preferences" />
      <Card className="p-1">
        <div className="px-4">
          <Tabs tabs={SETTINGS_TABS} active={tab} onChange={changeTab} />
        </div>
        <div className="p-5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              role="tabpanel"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <Panel />
            </motion.div>
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}
