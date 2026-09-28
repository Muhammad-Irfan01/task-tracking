import type { CannedResponse, FaqArticle } from "@/types";
import type { FaqCategoryRecord } from "./types";

export const faqCategories = (): FaqCategoryRecord[] => [
  { id: 1, name: "Getting Started" },
  { id: 2, name: "Billing & Payments" },
  { id: 3, name: "Shipping & Delivery" },
  { id: 4, name: "Account & Security" },
];

export const faqArticles = (): FaqArticle[] => [
  { id: 1, category: "Getting Started", question: "How do I create a new support ticket?", answer: 'Sign in to your account, select "New Ticket" from the dashboard, choose the relevant help topic, and describe your issue. Our team typically responds within the SLA window for your topic.', published: true, views: 1284 },
  { id: 2, category: "Billing & Payments", question: "Why was my payment declined?", answer: "Payments are most often declined due to insufficient funds, an expired card, or a mismatch between billing address and card details. Update your payment method under Account Settings and retry.", published: true, views: 2091 },
  { id: 3, category: "Shipping & Delivery", question: "How can I track my delivery?", answer: "Every order confirmation email includes a tracking link. You can also view live tracking from the Orders tab in your account dashboard.", published: true, views: 3567 },
  { id: 4, category: "Account & Security", question: "How do I reset my password?", answer: 'Click "Forgot password" on the sign-in page and follow the emailed link. For security, links expire after 30 minutes.', published: true, views: 1899 },
  { id: 5, category: "Billing & Payments", question: "Can I get a refund on a reversed transaction?", answer: "Reversal requests are reviewed by our Billing team within 2 business days. Approved reversals are credited to the original payment method.", published: true, views: 742 },
  { id: 6, category: "Getting Started", question: "What information should I include in a ticket?", answer: "Include your order or account number, a clear description of the issue, and any relevant screenshots. This helps us resolve your ticket faster.", published: false, views: 210 },
];

export const cannedResponses = (): CannedResponse[] => [
  { id: 1, title: "Order Delay Acknowledgement", dept: "Logistics & Warehousing", enabled: true, body: "Thank you for reaching out. We've confirmed your shipment is delayed and our logistics team is actively working to get it moving. We'll share a new estimated delivery date within 24 hours." },
  { id: 2, title: "Payment Reversal Confirmation", dept: "Billing & Accounts", enabled: true, body: "Your reversal request has been received and is under review by our billing team. Approved reversals are typically processed within 3-5 business days." },
  { id: 3, title: "Password Reset Instructions", dept: "Technical Support", enabled: true, body: 'You can reset your password from the sign-in screen by selecting "Forgot password." If you do not receive the email within a few minutes, please check your spam folder.' },
  { id: 4, title: "Escalation Notice", dept: "Escalations", enabled: true, body: "Your ticket has been escalated to a senior specialist due to its complexity. You can expect an update within one business day." },
  { id: 5, title: "Ticket Resolved — Closing", dept: "Customer Support", enabled: false, body: "We consider this issue resolved based on our last exchange. Feel free to reopen this ticket at any time if you need further assistance." },
];
