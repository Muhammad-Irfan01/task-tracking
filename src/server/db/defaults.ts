/**
 * Departments every organization starts with, each with the categories and
 * sub-categories a ticket raised to it can be filed under. New organizations
 * get them from provisionTenant(); migration 0009 added them to existing ones.
 */
export interface DefaultDepartment {
  name: string;
  /** Help topic routed to the department, so it can take tickets straight away. */
  topic: string;
  categories: { name: string; subcategories: string[] }[];
}

export const DEFAULT_DEPARTMENTS: DefaultDepartment[] = [
  {
    name: "IT",
    topic: "IT Support",
    categories: [
      { name: "Hardware", subcategories: ["Laptop / Desktop", "Monitor & Peripherals", "Printer & Scanner", "Mobile Device"] },
      { name: "Software", subcategories: ["Installation Request", "License Request", "Application Error", "Software Update"] },
      { name: "Network & Connectivity", subcategories: ["Internet / Wi-Fi", "VPN", "Network Drive / Shared Folder"] },
      { name: "Email & Communication", subcategories: ["Email Issue", "Teams / Chat", "Calendar"] },
      { name: "Accounts & Access", subcategories: ["New Account", "Password Reset", "Access Permission", "Account Locked"] },
      { name: "Security", subcategories: ["Virus / Malware", "Phishing Email", "Lost or Stolen Device"] },
    ],
  },
  {
    name: "Admin",
    topic: "Admin Request",
    categories: [
      { name: "Facilities & Maintenance", subcategories: ["Electrical", "Plumbing", "Air Conditioning", "Furniture", "Cleaning"] },
      { name: "Office Supplies", subcategories: ["Stationery", "Pantry Supplies", "Printing Supplies"] },
      { name: "Transport & Travel", subcategories: ["Vehicle Request", "Travel Booking", "Hotel Booking"] },
      { name: "Access Cards & Security", subcategories: ["New Access Card", "Lost Access Card", "Visitor Pass", "Parking"] },
      { name: "Meeting Rooms & Events", subcategories: ["Room Booking", "Event Arrangement", "Catering"] },
    ],
  },
  {
    name: "HR",
    topic: "HR Request",
    categories: [
      { name: "Payroll & Salary", subcategories: ["Salary Query", "Salary Certificate", "Deductions", "Reimbursement"] },
      { name: "Leave & Attendance", subcategories: ["Leave Request", "Leave Balance", "Attendance Correction"] },
      { name: "Benefits", subcategories: ["Medical Insurance", "Allowances", "Other Benefits"] },
      { name: "Recruitment & Onboarding", subcategories: ["New Hire Request", "Onboarding", "Probation"] },
      { name: "Employee Documents", subcategories: ["Experience Letter", "Employment Letter", "Employment Contract", "ID / Visa Documents"] },
      { name: "Training & Development", subcategories: ["Training Request", "Performance Review"] },
      { name: "Policies & Grievances", subcategories: ["Policy Question", "Complaint / Grievance", "Resignation & Exit"] },
    ],
  },
];
