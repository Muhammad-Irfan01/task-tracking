import type { CustomerStatus, TicketStatus } from "@/types";

/** Maps customer account states onto the shared badge palette. */
export const CUSTOMER_BADGE_TONE: Record<CustomerStatus, TicketStatus> = {
  Active: "Resolved",
  Locked: "Overdue",
  Inactive: "Closed",
};
