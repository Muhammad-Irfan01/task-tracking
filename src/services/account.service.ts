import type {
  ForgotPasswordInput,
  LoginInput,
  OrgSettingsInput,
  PasswordInput,
  ProfileInput,
  ResetPasswordInput,
} from "@/lib/schemas";
import type {
  AppNotification,
  LoginResult,
  OrgSettings,
  ReportRange,
  ReportSummary,
  SearchResults,
  SessionUser,
  UserPreferences,
} from "@/types";
import { apiClient, unwrap } from "./api-client";

export const authService = {
  login: (input: LoginInput) => unwrap<LoginResult>(apiClient.post("/auth/login", input)),
  logout: () => unwrap<{ signedOut: boolean }>(apiClient.post("/auth/logout")),
  forgotPassword: (input: ForgotPasswordInput) =>
    unwrap<{ devResetUrl?: string }>(apiClient.post("/auth/forgot-password", input)),
  resetPassword: (input: ResetPasswordInput) => unwrap<SessionUser>(apiClient.post("/auth/reset-password", input)),
};

export const accountService = {
  updateProfile: (input: ProfileInput) => unwrap<SessionUser>(apiClient.patch("/me", input)),
  changePassword: (input: PasswordInput) => unwrap<{ updated: boolean }>(apiClient.post("/me/password", input)),
  preferences: () => unwrap<UserPreferences>(apiClient.get("/me/preferences")),
  savePreferences: (prefs: UserPreferences) => unwrap<UserPreferences>(apiClient.put("/me/preferences", prefs)),
  orgSettings: () => unwrap<OrgSettings>(apiClient.get("/settings/organization")),
  saveOrgSettings: (input: OrgSettingsInput) => unwrap<OrgSettings>(apiClient.patch("/settings/organization", input)),
  uploadOrgLogo: (file: File) =>
    unwrap<OrgSettings>(apiClient.put("/settings/organization/logo", file, { headers: { "Content-Type": file.type } })),
  removeOrgLogo: () => unwrap<OrgSettings>(apiClient.delete("/settings/organization/logo")),
};

export interface NotificationFeed {
  items: AppNotification[];
  unread: number;
}

export const notificationsService = {
  list: () => unwrap<NotificationFeed>(apiClient.get("/notifications")),
  markRead: (ids?: string[]) => unwrap<NotificationFeed>(apiClient.post("/notifications/read", { ids })),
};

export const reportsService = {
  summary: (range: ReportRange) => unwrap<ReportSummary>(apiClient.get("/reports", { params: { range } })),
};

export const searchService = {
  search: (q: string, signal?: AbortSignal) => unwrap<SearchResults>(apiClient.get("/search", { params: { q }, signal })),
};
