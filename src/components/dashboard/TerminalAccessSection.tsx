import { TerminalLinkCard } from "@/components/dashboard/TerminalLinkCard";
import { TerminalQrPanel } from "@/components/dashboard/TerminalQrPanel";
import { TerminalQrUpsell } from "@/components/dashboard/TerminalQrUpsell";
import { canUseQrTerminal, getPlanLimits } from "@/lib/plan-features";

function isQrFeatureGloballyOff(): boolean {
  const flag = process.env.VREMA_FEATURE_QR_TERMINAL?.trim().toLowerCase();
  return !flag || flag === "off" || flag === "false";
}

export function TerminalAccessSection({
  terminalUrl,
  plan,
}: {
  terminalUrl: string;
  plan: string;
}) {
  const globallyOff = isQrFeatureGloballyOff();
  const showQr = canUseQrTerminal(plan);
  const planHasEntitlement = getPlanLimits(plan).qrTerminal;

  return (
    <div className="mt-4 space-y-4">
      <TerminalLinkCard terminalUrl={terminalUrl} />
      {showQr ? (
        <TerminalQrPanel terminalUrl={terminalUrl} />
      ) : (
        <TerminalQrUpsell plan={plan} globallyOff={globallyOff} needsUpgrade={!planHasEntitlement} />
      )}
    </div>
  );
}
