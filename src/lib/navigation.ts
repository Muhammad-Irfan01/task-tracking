import {
  BarChart3,
  BookOpen,
  Contact,
  LayoutDashboard,
  LifeBuoy,
  MessageSquareText,
  Network,
  Settings,
  Ticket,
  Timer,
  UserCog,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Only highlight on an exact path match (used for the root route). */
  exact?: boolean;
  /** Only organization admins see it; the page and its writes are admin-only too. */
  adminOnly?: boolean;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Workspace",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/tickets", label: "Tickets", icon: Ticket },
      { href: "/customers", label: "Customers", icon: Users },
    ],
  },
  {
    label: "Team",
    items: [
      { href: "/staff", label: "Agents", icon: UserCog, adminOnly: true },
      { href: "/employees", label: "Employees", icon: Contact, adminOnly: true },
      { href: "/departments", label: "Departments", icon: Network, adminOnly: true },
      { href: "/teams", label: "Teams", icon: UsersRound, adminOnly: true },
      { href: "/sla", label: "SLA Plans", icon: Timer, adminOnly: true },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/help-topics", label: "Help Topics", icon: LifeBuoy, adminOnly: true },
      { href: "/knowledge-base", label: "Knowledge Base", icon: BookOpen },
      { href: "/canned-responses", label: "Canned Responses", icon: MessageSquareText },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

/** The sidebar for this user: admin-only pages are left out for regular agents. */
export function navSectionsFor(user: { isAdmin: boolean }): NavSection[] {
  return NAV_SECTIONS.map((section) => ({ ...section, items: section.items.filter((item) => user.isAdmin || !item.adminOnly) })).filter(
    (section) => section.items.length > 0,
  );
}

export function isNavActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
