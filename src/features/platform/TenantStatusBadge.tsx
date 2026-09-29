import { Badge } from "@/components/ui";
import type { Tenant } from "@/types";

export function TenantStatusBadge({ status }: { status: Tenant["status"] }) {
  return <Badge status={status === "Active" ? "Resolved" : "Overdue"}>{status}</Badge>;
}
