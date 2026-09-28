import type {
  Agent,
  Customer,
  Department,
  FaqCategory,
  HelpTopic,
  NotificationType,
  Organization,
  SlaPlan,
  Team,
  Ticket,
  TicketMessage,
} from "@/types";

/** Stored shapes: the public entity types minus fields computed on read. */
export type CustomerRecord = Omit<Customer, "tickets">;
export type OrganizationRecord = Omit<Organization, "users">;
export type AgentRecord = Omit<Agent, "resolvedThisMonth" | "openTickets">;
export type DepartmentRecord = Omit<Department, "agents" | "ticketsOpen">;
export type TeamRecord = Omit<Team, "members">;
export type SlaPlanRecord = Omit<SlaPlan, "tickets">;
export type HelpTopicRecord = Omit<HelpTopic, "ticketsThisMonth">;
export type FaqCategoryRecord = Omit<FaqCategory, "count">;
export type TicketRecord = Omit<Ticket, "isOverdue">;

export interface MessageRecord extends Omit<TicketMessage, "attachments"> {
  attachmentIds: string[];
}

export interface StoredAttachment {
  id: string;
  ticketId: number;
  name: string;
  size: number;
  type: string;
  data: Buffer;
}

export interface NotificationRecord {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  /** `null` broadcasts to every agent. */
  recipientId: number | null;
}

export interface Credential {
  salt: string;
  hash: string;
}

/** Password-reset / invite token. Only the SHA-256 of the token is stored. */
export interface ResetToken {
  staffId: number;
  expiresAt: number;
  purpose: "reset" | "invite";
}
