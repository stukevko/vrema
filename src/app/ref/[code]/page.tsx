import { redirect } from "next/navigation";
import { normalizeReferralCode } from "@/lib/trial/referral";

type Props = {
  params: Promise<{ code: string }>;
};

/** Kurz-Link für Flyer/QR: /ref/speyer → Registrierung mit Kampagnen-Code. */
export default async function RefLandingPage({ params }: Props) {
  const { code } = await params;
  const ref = normalizeReferralCode(code);
  if (!ref) redirect("/auth/register");
  redirect(`/auth/register?ref=${encodeURIComponent(ref)}`);
}
