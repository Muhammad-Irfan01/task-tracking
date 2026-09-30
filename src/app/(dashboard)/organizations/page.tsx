import { redirect } from "next/navigation";

/**
 * Hidden: organization admins don't manage customer companies, and requesters are
 * grouped under "Independent Customers" automatically. The API stays for the customer
 * form's company list.
 */
export default function Page() {
  redirect("/");
}
