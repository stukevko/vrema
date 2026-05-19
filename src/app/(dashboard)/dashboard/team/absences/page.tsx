import { redirect } from "next/navigation";

/** Legacy-Route: Abwesenheiten leben unter Urlaub & Abwesenheit. */
export default function TeamAbsencesRedirectPage() {
  redirect("/dashboard/vacation#abwesenheiten");
}
