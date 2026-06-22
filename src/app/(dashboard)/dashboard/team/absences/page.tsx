import { redirect } from "next/navigation";

/** Legacy-Route: Abwesenheiten leben unter /dashboard/vacation. */
export default function TeamAbsencesRedirectPage() {
  redirect("/dashboard/vacation#abwesenheiten");
}
