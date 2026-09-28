import {
  BarChart3,
  BookOpen,
  Building2,
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
      { href: "/organizations", label: "Organizations", icon: Building2 },
    ],
  },
  {
    label: "Team",
    items: [
      { href: "/staff", label: "Agents", icon: UserCog },
      { href: "/departments", label: "Departments", icon: Network },
      { href: "/teams", label: "Teams", icon: UsersRound },
      { href: "/sla", label: "SLA Plans", icon: Timer },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/help-topics", label: "Help Topics", icon: LifeBuoy },
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

export function isNavActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
