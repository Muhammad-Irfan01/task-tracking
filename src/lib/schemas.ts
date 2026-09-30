import { z } from "zod";
import { PLAN_IDS } from "./constants";

/**
 * Validation schemas shared by forms (client) and route handlers (server),
 * so both sides always agree on what a valid payload is.
 */

const required = (label: string, max = 120) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

const email = z.email("Enter a valid email address").trim().toLowerCase();

export const TICKET_STATUS_VALUES = ["Open", "In Progress", "On Hold", "Resolved", "Closed", "Overdue"] as const;
export const TICKET_PRIORITY_VALUES = ["Low", "Normal", "High", "Emergency"] as const;
export const CUSTOMER_STATUS_VALUES = ["Active", "Locked", "Inactive"] as const;
export const AGENT_ROLE_VALUES = ["Agent", "Senior Agent", "Department Manager"] as const;

export const ticketCreateSchema = z.object({
  subject: required("Subject", 200),
  customerName: required("Customer name"),
  customerEmail: email,
  department: required("Department"),
  topic: required("Help topic"),
  priority: z.enum(TICKET_PRIORITY_VALUES, "Choose a priority"),
  message: z.string().trim().min(1, "Please describe the issue").max(10_000),
});

/** What an employee fills in on the portal; the requester is always themselves. */
export const portalTicketSchema = ticketCreateSchema.omit({ customerName: true, customerEmail: true });

/** An employee rating their resolved ticket. */
export const ticketRatingSchema = z.object({
  rating: z.number("Choose a rating").int().min(1, "Choose a rating").max(5, "Choose a rating"),
  comment: z.string().trim().max(1000, "Keep it under 1,000 characters").optional().default(""),
});

export const ticketUpdateSchema = z
  .object({
    status: z.enum(TICKET_STATUS_VALUES, "Unknown status"),
    priority: z.enum(TICKET_PRIORITY_VALUES, "Unknown priority"),
    assignee: required("Assignee"),
    department: required("Department"),
    topic: required("Help topic"),
  })
  .partial();

export const customerSchema = z.object({
  name: required("Name"),
  email,
  phone: z.string().trim().max(40),
  organization: required("Organization"),
  status: z.enum(CUSTOMER_STATUS_VALUES),
});

export const organizationSchema = z.object({
  name: required("Name"),
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^(—|[a-z0-9-]+(\.[a-z0-9-]+)+)$/, "Enter a domain like example.com"),
  status: z.enum(["Active", "Inactive"]),
});

export const agentSchema = z.object({
  name: required("Name"),
  email,
  dept: required("Department"),
  role: z.enum(AGENT_ROLE_VALUES),
  isAdmin: z.boolean(),
  active: z.boolean(),
  onVacation: z.boolean(),
});

/** A portal user who raises tickets (created by an org admin). */
export const employeeSchema = z.object({
  name: required("Name"),
  email,
  dept: required("Department"),
  active: z.boolean(),
});

export const departmentSchema = z.object({
  name: required("Name"),
  manager: required("Manager"),
  isPublic: z.boolean(),
});

export const teamSchema = z.object({
  name: required("Name"),
  lead: required("Team lead"),
  memberIds: z.array(z.number().int()).min(1, "Pick at least one member"),
  notes: z.string().trim().max(500),
});

export const slaPlanSchema = z.object({
  name: required("Name"),
  graceHours: z.number("Enter a number of hours").int("Use whole hours").min(1, "At least 1 hour").max(720, "At most 720 hours"),
  notes: z.string().trim().max(500),
});

export const helpTopicSchema = z.object({
  name: required("Name"),
  dept: required("Department"),
  sla: required("SLA plan"),
});

export const faqCategorySchema = z.object({ name: required("Name", 60) });

export const articleSchema = z.object({
  category: required("Category"),
  question: required("Question", 200),
  answer: z.string().trim().min(1, "Answer is required").max(10_000),
  published: z.boolean(),
});

export const cannedResponseSchema = z.object({
  title: required("Title"),
  dept: required("Department"),
  enabled: z.boolean(),
  body: z.string().trim().min(1, "Response text is required").max(5_000),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});

export const profileSchema = z.object({
  name: required("Display name"),
  email,
});

/** Password policy shared by sign-up, reset and change-password. */
export const newPassword = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Use at most 128 characters")
  .regex(/[a-zA-Z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

export const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    next: newPassword,
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { path: ["confirm"], message: "Passwords don't match" });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "This reset link is invalid"),
    password: newPassword,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });

export const preferencesSchema = z.object({
  assigned: z.boolean(),
  reply: z.boolean(),
  sla: z.boolean(),
  digest: z.boolean(),
  // Optional so clients that predate it keep working; a missing value means "on".
  emailUpdates: z.boolean().default(true),
});

export const orgSettingsSchema = z.object({
  name: required("Workspace name"),
  supportEmail: email,
  timezone: required("Time zone"),
});

export const TENANT_STATUS_VALUES = ["Active", "Suspended"] as const;

/** Free email providers can't be claimed by one organization — everyone uses them. */
export const PUBLIC_EMAIL_DOMAINS = [
  "gmail.com", "googlemail.com", "yahoo.com", "ymail.com", "outlook.com", "hotmail.com", "live.com", "msn.com",
  "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com", "gmx.com", "mail.com", "zoho.com", "yandex.com",
];

/** Lower-case `name@domain` check, shared by forms and the server. */
export function emailInDomain(address: string, domain: string | null | undefined) {
  return !domain || address.trim().toLowerCase().endsWith(`@${domain.toLowerCase()}`);
}

/** Company email domain like "acme.com"; blank means "no restriction". */
const emailDomain = z
  .string()
  .trim()
  .toLowerCase()
  .transform((v) => v.replace(/^@/, ""))
  .pipe(
    z.union([
      z.literal("").transform(() => null),
      z
        .string()
        .regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/, "Enter a domain like acme.com")
        .refine((d) => !PUBLIC_EMAIL_DOMAINS.includes(d), "Use the organization's own domain, not a public email provider"),
    ]),
  )
  .nullable();

/** A client organization on the platform, as the super admin edits it. */
export const tenantSchema = z.object({
  name: required("Organization name"),
  supportEmail: email,
  emailDomain,
  timezone: required("Time zone"),
  plan: z.enum(PLAN_IDS, "Choose a plan"),
  status: z.enum(TENANT_STATUS_VALUES),
});

/** New organization plus its first administrator, who gets an invite email. */
export const tenantCreateSchema = tenantSchema
  .omit({ status: true })
  .extend({
    adminName: required("Admin name"),
    adminEmail: email,
  })
  .refine((v) => v.emailDomain, { path: ["emailDomain"], message: "Staff email domain is required" })
  .refine((v) => emailInDomain(v.adminEmail, v.emailDomain), {
    path: ["adminEmail"],
    message: "The admin's email must be on the organization's domain",
  });

export const tenantAdminSchema = z.object({
  name: required("Name"),
  email,
});

export type TicketCreateInput = z.infer<typeof ticketCreateSchema>;
export type TicketUpdateInput = z.infer<typeof ticketUpdateSchema>;
export type PortalTicketInput = z.infer<typeof portalTicketSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type OrganizationInput = z.infer<typeof organizationSchema>;
export type AgentInput = z.infer<typeof agentSchema>;
export type DepartmentInput = z.infer<typeof departmentSchema>;
export type TeamInput = z.infer<typeof teamSchema>;
export type SlaPlanInput = z.infer<typeof slaPlanSchema>;
export type HelpTopicInput = z.infer<typeof helpTopicSchema>;
export type FaqCategoryInput = z.infer<typeof faqCategorySchema>;
export type ArticleInput = z.infer<typeof articleSchema>;
export type CannedResponseInput = z.infer<typeof cannedResponseSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type PasswordInput = z.infer<typeof passwordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type OrgSettingsInput = z.infer<typeof orgSettingsSchema>;
export type EmployeeInput = z.infer<typeof employeeSchema>;
export type TenantInput = z.infer<typeof tenantSchema>;
export type TenantCreateInput = z.infer<typeof tenantCreateSchema>;
export type TenantAdminInput = z.infer<typeof tenantAdminSchema>;

export type FieldErrors = Record<string, string>;

/** Flattens a zod error into `{ field: firstMessage }`. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    errors[key] ??= issue.message;
  }
  return errors;
}

export type AttachmentStorage = "database" | "blob";

export interface AttachmentLimits {
  storage: AttachmentStorage;
  maxFiles: number;
  maxBytes: number;
  maxTotalBytes: number;
}

const MB = 1024 * 1024;

/**
 * `database`: files are posted with the reply and stored in Postgres. Vercel
 * functions accept request bodies up to 4.5 MB, so a whole reply (all files
 * plus form overhead) must stay under that.
 *
 * `blob`: the browser uploads straight to private Vercel Blob storage and the
 * reply only carries references, so the function body limit doesn't apply.
 */
export const ATTACHMENT_LIMITS: Record<AttachmentStorage, AttachmentLimits> = {
  database: { storage: "database", maxFiles: 5, maxBytes: 4 * MB, maxTotalBytes: 4 * MB },
  blob: { storage: "blob", maxFiles: 5, maxBytes: 25 * MB, maxTotalBytes: 100 * MB },
};

/** Files already uploaded to blob storage, referenced from a reply. */
export const blobUploadsSchema = z
  .array(z.object({ pathname: z.string().min(1).max(1024), name: z.string().min(1).max(255) }))
  .max(ATTACHMENT_LIMITS.blob.maxFiles);

export type BlobUpload = z.infer<typeof blobUploadsSchema>[number];
