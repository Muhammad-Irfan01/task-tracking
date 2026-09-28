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
  dept: string;
  isAdmin: boolean;
  avatarColor: string;
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
