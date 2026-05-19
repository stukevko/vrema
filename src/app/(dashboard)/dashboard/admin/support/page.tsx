import { redirect } from "next/navigation";

/** Legacy-Route: Team-Support ist Tab auf Hilfe & Support. */
export default function OrgAdminSupportRedirectPage() {
  redirect("/dashboard/support?tab=team");
}
