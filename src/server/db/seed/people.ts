import { isClosedStatus, TICKET_PRIORITIES, TICKET_SOURCES, TICKET_STATUSES } from "@/lib/constants";
import type { CustomerStatus } from "@/types";
import type {
  AgentRecord,
  CustomerRecord,
  HelpTopicRecord,
  MessageRecord,
  OrganizationRecord,
  SlaPlanRecord,
  TicketRecord,
} from "./types";

/** Deterministic LCG so the generated dataset is stable across restarts. */
export function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const FIRST_NAMES =
  "Ayesha.Bilal.Carmen.Derek.Elena.Farhan.Grace.Hamza.Ines.Jamal.Kiran.Liam.Mona.Nadia.Omar.Priya.Qasim.Rosa.Sana.Tariq.Uma.Victor.Wania.Xavier.Yusuf.Zara".split(".");
const LAST_NAMES = ["Malik", "Fernandez", "Khan", "Osei", "Larsen", "Iqbal", "Moreau", "Siddiqui", "Reyes", "Novak", "Ahmed", "Costa", "Baig", "Dumont", "Farooq", "Singh", "Meyer", "Butt", "Alvi", "Cruz"];
const CUSTOMER_STATUSES: CustomerStatus[] = ["Active", "Active", "Active", "Locked", "Inactive"];

export function buildCustomers(organizations: OrganizationRecord[]): CustomerRecord[] {
  const random = seededRandom(101);
  return Array.from({ length: 26 }, (_, i) => {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[(i * 3 + 2) % LAST_NAMES.length];
    const org = organizations[Math.floor(random() * organizations.length)];
    const domain = org.domain === "—" ? "mail.com" : org.domain;
    return {
      id: i + 1,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`,
      phone: `+1 (5${(50 + i).toString().slice(-2)}) 555-0${(100 + i * 7).toString().slice(-3)}`,
      organization: org.name,
      status: CUSTOMER_STATUSES[i % CUSTOMER_STATUSES.length],
      joined: new Date(2023, (i * 2) % 12, ((i * 5) % 27) + 1).toISOString(),
    };
  });
}

const SUBJECTS = [
  "Order has not arrived after 2 weeks", "Unable to log into my account", "Charged twice for the same invoice", "Product arrived damaged",
  "Need help updating billing address", "Refund still not processed", "Warehouse rent invoice discrepancy", "API integration returning 500 errors",
  "Reversal request for duplicate entry", "Tracking number not updating", "Subscription renewal failed", "Request to change delivery address",
  "Missing item from bulk order", "Password reset link expired", "Enterprise contract SLA clarification", "Delayed shipment from regional warehouse",
  "Question about volume discount pricing", "Account locked after failed login attempts", "Invoice PDF not generating correctly", "Escalation: recurring payment gateway timeout",
];

const CUSTOMER_MESSAGES = [
  "Kindly reverse the entry as the amount was posted twice this cycle.",
  "The tracking page has not updated in four days and the customer is asking for a status.",
  "We would like clarification on the SLA terms for our enterprise plan renewal.",
  "The item was received with visible damage to the packaging and the product itself.",
  "Please confirm the corrected invoice has been issued to the right billing contact.",
  "Our integration has been returning intermittent server errors since this morning.",
  "The warehouse rent figure on this cycle does not match our agreed contract rate.",
  "Customer is requesting an update on when the refund will reflect in their account.",
];

const AGENT_REPLIES = [
  "Thanks for the details — I’ve looked into this and here’s what we found. We’re taking the next step now and will follow up shortly with an update.",
  "I’ve escalated this internally and flagged it as a priority. You’ll hear back from us as soon as we have confirmation.",
  "Could you share any reference numbers or screenshots? That will help us pinpoint the issue faster.",
  "This has now been corrected on our side. Please let us know if you still see the problem.",
];

export function ticketNumber(id: number) {
  return `RD${id.toString().padStart(6, "0")}`;
}

interface TicketSeedContext {
  customers: CustomerRecord[];
  staff: AgentRecord[];
  helpTopics: HelpTopicRecord[];
  slaPlans: SlaPlanRecord[];
}

export const TICKET_ID_START = 8800;
const TICKET_COUNT = 220;
const HISTORY_DAYS = 90;

export function buildTickets({ customers, staff, helpTopics, slaPlans }: TicketSeedContext) {
  const random = seededRandom(7);
  const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)];
  const now = Date.now();
  const activeStaff = staff.filter((agent) => agent.active);
  const tickets: TicketRecord[] = [];
  const threads = new Map<number, MessageRecord[]>();

  for (let i = 0; i < TICKET_COUNT; i++) {
    const id = TICKET_ID_START + i;
    const status = pick(TICKET_STATUSES).name;
    const priority = pick(TICKET_PRIORITIES).name;
    const topic = pick(helpTopics);
    const inDept = activeStaff.filter((agent) => agent.dept === topic.dept);
    const assignee = inDept.length > 0 && random() < 0.65 ? pick(inDept) : pick(activeStaff);
    const customer = pick(customers);
    const graceHours = slaPlans.find((plan) => plan.name === topic.sla)?.graceHours ?? 48;

    const created = now - Math.floor(random() * HISTORY_DAYS * DAY) - Math.floor(random() * 12 * HOUR) - HOUR;
    const closed = isClosedStatus(status);
    // Resolved tickets close within 2h–6d; open ones were last touched any time since creation.
    const updated = closed
      ? Math.min(now, created + Math.floor((2 + random() * 142) * HOUR))
      : created + Math.floor(random() * (now - created));
    const messages = 2 + Math.floor(random() * 6);
    const firstResponse = Math.min(updated, created + (15 + Math.floor(random() * 600)) * 60_000);

    // Open tickets get a live SLA clock: ~25% have already breached, the rest are due soon.
    let dueAt: number;
    if (closed) dueAt = created + graceHours * HOUR;
    else if (status === "Overdue" || random() > 0.75) dueAt = now - Math.floor((1 + random() * 48) * HOUR);
    else dueAt = now + Math.floor((2 + random() * 70) * HOUR);

    const ratingRoll = random();
    const ticket: TicketRecord = {
      id,
      number: ticketNumber(id),
      subject: SUBJECTS[i % SUBJECTS.length],
      excerpt: CUSTOMER_MESSAGES[i % CUSTOMER_MESSAGES.length],
      status,
      priority,
      department: topic.dept,
      topic: topic.name,
      assignee: assignee.name,
      customer: customer.name,
      customerEmail: customer.email,
      organization: customer.organization,
      source: pick(TICKET_SOURCES),
      created: new Date(created).toISOString(),
      updated: new Date(updated).toISOString(),
      dueAt: new Date(dueAt).toISOString(),
      resolvedAt: closed ? new Date(updated).toISOString() : null,
      firstResponseAt: new Date(firstResponse).toISOString(),
      rating: closed && ratingRoll < 0.8 ? (ratingRoll < 0.08 ? 2 : ratingRoll < 0.2 ? 3 : ratingRoll < 0.5 ? 4 : 5) : null,
      messages,
    };
    tickets.push(ticket);
    threads.set(id, buildThread(ticket, messages));
  }

  return { tickets, threads };
}

/** Alternating customer/agent thread spread between the ticket's created and updated times. */
function buildThread(ticket: TicketRecord, count: number): MessageRecord[] {
  const start = new Date(ticket.created).getTime();
  const end = new Date(ticket.updated).getTime();
  const firstReply = new Date(ticket.firstResponseAt ?? ticket.updated).getTime();

  return Array.from({ length: count }, (_, i) => {
    const isStaff = i % 2 === 1;
    let time = start + ((end - start) * i) / Math.max(1, count - 1);
    if (i === 0) time = start;
    if (i === 1) time = firstReply;
    return {
      id: `${ticket.id}-${i}`,
      author: isStaff ? ticket.assignee : ticket.customer,
      isStaff,
      created: new Date(Math.max(time, firstReply * Number(i >= 1))).toISOString(),
      body: isStaff
        ? AGENT_REPLIES[(ticket.id + i) % AGENT_REPLIES.length]
        : i === 0
          ? ticket.excerpt
          : CUSTOMER_MESSAGES[(ticket.id + i) % CUSTOMER_MESSAGES.length],
      attachmentIds: [],
    };
  });
}
