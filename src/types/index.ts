import type { PlanId } from "@/lib/constants";

export type TicketStatus =
  | "Open"
  | "In Progress"
  | "On Hold"
  | "Resolved"
  | "Closed"
  | "Overdue";

export type TicketPriority = "Low" | "Normal" | "High" | "Emergency";

export type TicketSource = "Web" | "Email" | "Phone" | "API" | "Other";

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

export interface Ticket {
  id: number;
  number: string;
  subject: string;
  excerpt: string;
  status: TicketStatus;
  priority: TicketPriority;
  department: string;
  topic: string;
  assignee: string;
  customer: string;
  customerEmail: string;
  organization: string;
  source: TicketSource;
  created: string;
  updated: string;
  /** SLA response deadline derived from the help topic's plan. */
  dueAt: string;
  resolvedAt: string | null;
  firstResponseAt: string | null;
  /** Customer satisfaction score (1–5) left after resolution. */
  rating: number | null;
  /** Computed: still open and past `dueAt`. */
  isOverdue: boolean;
  messages: number;
}

export interface TicketMessage {
  id: string;
  author: string;
  isStaff: boolean;
  created: string;
  body: string;
  attachments: Attachment[];
}

export type CustomerStatus = "Active" | "Locked" | "Inactive";

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  organization: string;
  status: CustomerStatus;
  /** Computed from tickets. */
  tickets: number;
  joined: string;
}

export interface Organization {
  id: number;
  name: string;
  domain: string;
  status: "Active" | "Inactive";
  /** Computed from customers. */
  users: number;
}

export interface Agent {
  id: number;
  name: string;
  email: string;
  dept: string;
  role: string;
  isAdmin: boolean;
  active: boolean;
  avatarColor: string;
  onVacation: boolean;
  /** Computed from tickets. */
  resolvedThisMonth: number;
  openTickets: number;
}

export interface Department {
  id: number;
  name: string;
  manager: string;
  isPublic: boolean;
  /** Computed from staff and tickets. */
  agents: number;
  ticketsOpen: number;
}

export interface Team {
  id: number;
  name: string;
  lead: string;
  memberIds: number[];
  notes: string;
  /** Computed from memberIds. */
  members: number;
}

export interface SlaPlan {
  id: number;
  name: string;
  graceHours: number;
  notes: string;
  /** Computed: open tickets whose help topic uses this plan. */
  tickets: number;
}

export interface HelpTopic {
  id: number;
  name: string;
  dept: string;
  sla: string;
  /** Computed: tickets opened in the last 30 days. */
  ticketsThisMonth: number;
}

export interface FaqCategory {
  id: number;
  name: string;
  /** Computed from articles. */
  count: number;
}

export interface FaqArticle {
  id: number;
  category: string;
  question: string;
  answer: string;
  published: boolean;
  views: number;
}

export interface CannedResponse {
  id: number;
  title: string;
  dept: string;
  enabled: boolean;
  body: string;
}

export type NotificationType = "assigned" | "reply" | "sla";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  read: boolean;
}

export interface SessionUser {
  id: number;
  name: string;
  firstName: string;
  email: string;
  role: string;
  /** "agent" works in the desk; "employee" only uses the portal (/portal) for their own tickets. */
  kind: "agent" | "employee";
  dept: string;
  isAdmin: boolean;
  avatarColor: string;
  /** The client organization this agent belongs to. */
  tenantId: number;
  tenantName: string;
  /** Staff emails must end with @this domain; null = no restriction. */
  tenantEmailDomain: string | null;
}

/** What the portal's "New ticket" form can offer: public departments and their help topics. */
export interface PortalOptions {
  departments: { name: string; topics: string[] }[];
}

/** A portal user who raises and follows their own tickets. */
export interface Employee {
  id: number;
  name: string;
  email: string;
  /** The employee's own department (not where their tickets go). */
  dept: string;
  active: boolean;
  avatarColor: string;
  /** False until they've used their invite. */
  hasPassword: boolean;
  openTickets: number;
  totalTickets: number;
}

/** A platform operator (super admin) who manages client organizations. */
export interface PlatformUser {
  id: number;
  name: string;
  email: string;
}

export type LoginResult = { kind: "staff"; user: SessionUser } | { kind: "platform"; user: PlatformUser };

/** A client organization as seen from the platform console. */
export interface Tenant {
  id: number;
  name: string;
  supportEmail: string;
  emailDomain: string | null;
  timezone: string;
  plan: PlanId;
  /** Employee limit that comes with the plan. */
  maxAgents: number;
  status: "Active" | "Suspended";
  createdAt: string;
  agents: number;
  admins: number;
  openTickets: number;
  totalTickets: number;
}

export interface TenantMember {
  id: number;
  name: string;
  email: string;
  role: string;
  isAdmin: boolean;
  active: boolean;
  /** False until the invited person sets a password. */
  hasPassword: boolean;
}

export interface TenantDetail extends Tenant {
  members: TenantMember[];
}

export interface UserPreferences {
  assigned: boolean;
  reply: boolean;
  sla: boolean;
  digest: boolean;
}

export interface OrgSettings {
  name: string;
  supportEmail: string;
  timezone: string;
  plan: string;
  /** Computed: active agents. */
  seatsUsed: number;
  /** Employee limit of the plan (set by the platform). */
  maxAgents: number;
  /** Staff email domain set by the platform; null means any. */
  emailDomain: string | null;
}

export interface VolumePoint {
  label: string;
  opened: number;
  resolved: number;
}

export interface Metric {
  value: number | null;
  previous: number | null;
}

export type ReportRange = 7 | 30 | 90;

export interface ReportSummary {
  range: ReportRange;
  openTickets: number;
  overdueTickets: number;
  atRiskTickets: number;
  ticketsOpened: Metric;
  ticketsResolved: Metric;
  /** Minutes. */
  avgFirstResponse: Metric;
  /** Minutes. */
  avgResolution: Metric;
  /** Percentage 0–100. */
  firstContactResolution: Metric;
  /** Average 1–5. */
  satisfaction: Metric;
  volume: VolumePoint[];
  priorityMix: { name: TicketPriority; value: number; color: string }[];
  departmentLoad: { name: string; value: number }[];
  leaderboard: { id: number; name: string; avatarColor: string; resolved: number; open: number; avgResolution: number | null }[];
}

export interface SearchResults {
  tickets: Pick<Ticket, "id" | "number" | "subject" | "status">[];
  customers: Pick<Customer, "id" | "name" | "email">[];
  agents: Pick<Agent, "id" | "name" | "dept">[];
  articles: Pick<FaqArticle, "id" | "question" | "category">[];
}

export type AsyncStatus = "idle" | "loading" | "success" | "error";

export interface ApiError {
  message: string;
  status?: number;
  errors?: Record<string, string>;
}
