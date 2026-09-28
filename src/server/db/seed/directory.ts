import type {
  AgentRecord,
  DepartmentRecord,
  HelpTopicRecord,
  OrganizationRecord,
  SlaPlanRecord,
  TeamRecord,
} from "./types";

export const organizations = (): OrganizationRecord[] => [
  { id: 1, name: "Horizon Retail Group", domain: "horizonretail.com", status: "Active" },
  { id: 2, name: "Northbridge Logistics", domain: "northbridgelog.com", status: "Active" },
  { id: 3, name: "Solace Health Partners", domain: "solacehealth.org", status: "Active" },
  { id: 4, name: "Ferro Manufacturing Co.", domain: "ferromfg.com", status: "Active" },
  { id: 5, name: "Bluepeak Media", domain: "bluepeakmedia.tv", status: "Inactive" },
  { id: 6, name: "Independent Customers", domain: "—", status: "Active" },
];

export const departments = (): DepartmentRecord[] => [
  { id: 1, name: "Customer Support", manager: "Amara Chen", isPublic: true },
  { id: 2, name: "Technical Support", manager: "Rafael Ortiz", isPublic: true },
  { id: 3, name: "Billing & Accounts", manager: "Priya Nair", isPublic: true },
  { id: 4, name: "Sales Enquiries", manager: "Tom Hastings", isPublic: true },
  { id: 5, name: "Logistics & Warehousing", manager: "Meera Iyer", isPublic: false },
  { id: 6, name: "Infrastructure & IT", manager: "Daniel Kessler", isPublic: false },
  { id: 7, name: "HR & Facilities", manager: "Grace Okafor", isPublic: false },
  { id: 8, name: "Escalations", manager: "Amara Chen", isPublic: false },
];

export const staff = (): AgentRecord[] => [
  { id: 1, name: "Amara Chen", email: "amara.chen@threadline.io", dept: "Customer Support", role: "Department Manager", isAdmin: true, active: true, avatarColor: "bg-brand-500", onVacation: false },
  { id: 2, name: "Rafael Ortiz", email: "rafael.ortiz@threadline.io", dept: "Technical Support", role: "Senior Agent", isAdmin: true, active: true, avatarColor: "bg-emerald-500", onVacation: false },
  { id: 3, name: "Priya Nair", email: "priya.nair@threadline.io", dept: "Billing & Accounts", role: "Department Manager", isAdmin: false, active: true, avatarColor: "bg-amber-500", onVacation: false },
  { id: 4, name: "Tom Hastings", email: "tom.hastings@threadline.io", dept: "Sales Enquiries", role: "Agent", isAdmin: false, active: true, avatarColor: "bg-rose-500", onVacation: true },
  { id: 5, name: "Meera Iyer", email: "meera.iyer@threadline.io", dept: "Logistics & Warehousing", role: "Department Manager", isAdmin: false, active: true, avatarColor: "bg-brand-400", onVacation: false },
  { id: 6, name: "Daniel Kessler", email: "daniel.kessler@threadline.io", dept: "Infrastructure & IT", role: "Senior Agent", isAdmin: true, active: true, avatarColor: "bg-emerald-600", onVacation: false },
  { id: 7, name: "Grace Okafor", email: "grace.okafor@threadline.io", dept: "HR & Facilities", role: "Agent", isAdmin: false, active: true, avatarColor: "bg-amber-600", onVacation: false },
  { id: 8, name: "Noah Bergström", email: "noah.bergstrom@threadline.io", dept: "Technical Support", role: "Agent", isAdmin: false, active: true, avatarColor: "bg-brand-600", onVacation: false },
  { id: 9, name: "Layla Haddad", email: "layla.haddad@threadline.io", dept: "Customer Support", role: "Agent", isAdmin: false, active: true, avatarColor: "bg-rose-400", onVacation: false },
  { id: 10, name: "Kenji Watanabe", email: "kenji.watanabe@threadline.io", dept: "Escalations", role: "Senior Agent", isAdmin: true, active: true, avatarColor: "bg-emerald-400", onVacation: false },
  { id: 11, name: "Isla Fraser", email: "isla.fraser@threadline.io", dept: "Billing & Accounts", role: "Agent", isAdmin: false, active: false, avatarColor: "bg-slate-400", onVacation: false },
  { id: 12, name: "Marcus Webb", email: "marcus.webb@threadline.io", dept: "Logistics & Warehousing", role: "Agent", isAdmin: false, active: true, avatarColor: "bg-amber-400", onVacation: false },
];

export const teams = (): TeamRecord[] => [
  { id: 1, name: "Frontline Response", lead: "Amara Chen", memberIds: [1, 9, 4, 8, 12], notes: "First-touch triage for all inbound channels." },
  { id: 2, name: "Network Ops", lead: "Daniel Kessler", memberIds: [6, 2, 8], notes: "Handles infrastructure and connectivity incidents." },
  { id: 3, name: "Billing Resolutions", lead: "Priya Nair", memberIds: [3, 11, 9], notes: "Invoice disputes, refunds, and reversal requests." },
  { id: 4, name: "Field Logistics", lead: "Meera Iyer", memberIds: [5, 12, 7], notes: "Coordinates warehouse and delivery escalations." },
  { id: 5, name: "VIP Accounts", lead: "Rafael Ortiz", memberIds: [2, 10, 1], notes: "Dedicated support for enterprise customers." },
];

export const slaPlans = (): SlaPlanRecord[] => [
  { id: 1, name: "Standard SLA", graceHours: 48, notes: "Default plan applied to general enquiries." },
  { id: 2, name: "Priority SLA", graceHours: 24, notes: "Faster response window for flagged accounts." },
  { id: 3, name: "Enterprise SLA", graceHours: 8, notes: "Contractual 8-hour response for enterprise clients." },
  { id: 4, name: "Critical Incident SLA", graceHours: 2, notes: "Reserved for outages and payment failures." },
];

export const helpTopics = (): HelpTopicRecord[] => [
  { id: 1, name: "Order Status & Tracking", dept: "Customer Support", sla: "Standard SLA" },
  { id: 2, name: "Returns & Refunds", dept: "Billing & Accounts", sla: "Standard SLA" },
  { id: 3, name: "Login & Account Access", dept: "Technical Support", sla: "Priority SLA" },
  { id: 4, name: "Payment Failure", dept: "Billing & Accounts", sla: "Critical Incident SLA" },
  { id: 5, name: "Product Defect Report", dept: "Technical Support", sla: "Priority SLA" },
  { id: 6, name: "Delivery Delay", dept: "Logistics & Warehousing", sla: "Standard SLA" },
  { id: 7, name: "Warehouse & Rent Enquiry", dept: "Logistics & Warehousing", sla: "Standard SLA" },
  { id: 8, name: "Invoice Reversal Request", dept: "Billing & Accounts", sla: "Priority SLA" },
  { id: 9, name: "API Integration Support", dept: "Infrastructure & IT", sla: "Enterprise SLA" },
  { id: 10, name: "General Enquiry", dept: "Customer Support", sla: "Standard SLA" },
];
