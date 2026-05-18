import QRCode from "qrcode";
import { TerminalQrDownloadButton } from "@/components/dashboard/TerminalQrDownloadButton";

export async function TerminalQrPanel({ terminalUrl }: { terminalUrl: string }) {
  const dataUrl = await QRCode.toDataURL(terminalUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 280,
  });

  return (
    <div className="rounded-xl border border-border bg-background/60 p-4">
      <p className="text-sm font-semibold text-foreground">QR-Code fürs Terminal</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Am Küchen- oder Service-Tablet scannen — danach nur noch PIN. Kein GPS, kein App-Download.
      </p>
      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dataUrl}
          alt="QR-Code zur Terminal-URL"
          width={280}
          height={280}
          className="rounded-lg border border-border bg-white p-2"
        />
        <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:max-w-[14rem]">
          <p>
            QR ausdrucken oder als PNG speichern und am Stempel-Tablet platzieren. Der Link bleibt gleich, solange
            sich euer Betriebs-Slug nicht ändert.
          </p>
          <TerminalQrDownloadButton dataUrl={dataUrl} />
        </div>
      </div>
    </div>
  );
}
