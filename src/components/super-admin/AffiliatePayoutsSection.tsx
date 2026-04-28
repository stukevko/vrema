import { getSuperAdminAffiliatePayoutData } from "@/lib/actions/super-admin";
import { AffiliatePayoutsClient } from "./AffiliatePayoutsClient";

export async function AffiliatePayoutsSection() {
  const { affiliates, payoutQueue } = await getSuperAdminAffiliatePayoutData();
  return <AffiliatePayoutsClient affiliates={affiliates} payoutQueue={payoutQueue} />;
}
