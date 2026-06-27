import { VremaMarkLogo, VremaWordmark } from "./VremaMarkLogo";

export function AuthBrandLogo() {
  return (
    <div className="flex flex-col items-center gap-4">
      <VremaMarkLogo size={80} variant="tile" />
      <div className="flex flex-col items-center">
        <VremaWordmark size={36} className="text-foreground" />
        <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-fg-muted">
          Intelligente Zeiterfassung
        </span>
      </div>
    </div>
  );
}
