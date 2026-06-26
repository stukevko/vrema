import { VREMA_BRAND } from "@/lib/brand/assets";

/** Einheitliche Markenzeile auf Login, Register, Passwort-Flows & Partner-Login. */
export function AuthBrandLogo() {
  return (
    <div className="flex flex-col items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={VREMA_BRAND.logo}
        alt="VREMA – Intelligente Zeiterfassung"
        className="h-14 w-auto max-w-[min(100%,17.5rem)] object-contain sm:h-[4.25rem]"
      />
    </div>
  );
}
