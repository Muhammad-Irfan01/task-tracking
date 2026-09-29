import type { TenantAdminInput, TenantCreateInput, TenantInput } from "@/lib/schemas";
import type { Agent, Tenant, TenantDetail } from "@/types";
import { apiClient, unwrap } from "./api-client";

/** The set-password link comes back in development, or when it couldn't be emailed. */
export interface InviteResult {
  inviteEmailed: boolean;
  inviteUrl?: string;
}

export const platformService = {
  tenants: () => unwrap<Tenant[]>(apiClient.get("/platform/tenants")),
  tenant: (id: number | string) => unwrap<TenantDetail>(apiClient.get(`/platform/tenants/${id}`)),
  createTenant: (input: TenantCreateInput) => unwrap<TenantDetail & InviteResult>(apiClient.post("/platform/tenants", input)),
  updateTenant: (id: number, changes: Partial<TenantInput>) =>
    unwrap<TenantDetail>(apiClient.patch(`/platform/tenants/${id}`, changes)),
  deleteTenant: (id: number, confirm: string) =>
    unwrap<{ id: number }>(apiClient.delete(`/platform/tenants/${id}`, { data: { confirm } })),
  addAdmin: (id: number, input: TenantAdminInput) =>
    unwrap<Agent & InviteResult>(apiClient.post(`/platform/tenants/${id}/admins`, input)),
  resendInvite: (id: number, staffId: number) =>
    unwrap<InviteResult>(apiClient.post(`/platform/tenants/${id}/members/${staffId}/invite`)),
};
