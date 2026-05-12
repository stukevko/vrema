import { VremaMarkLogo, VremaWordmark } from "./VremaMarkLogo";

/** Einheitliche, große Markenzeile auf Login, Register, Passwort-Flows & Partner-Login. */
export function AuthBrandLogo() {
  return (
    <div className="flex flex-col items-center gap-4">
      <VremaMarkLogo
        size={84}
        className="drop-shadow-[0_18px_40px_hsl(199_92%_42%_/_0.35)]"
      />
      <div className="flex flex-col items-center">
        <VremaWordmark size={36} className="text-foreground" />
        <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-fg-muted">
          Intelligente Zeiterfassung
        </span>
      </div>
    </div>
  );
}
