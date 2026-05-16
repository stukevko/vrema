import { HelpCircle, type LucideIcon } from "lucide-react";
import type { SVGProps } from "react";

/** Lucide v0.x: Icons sind ForwardRef-Objekte (`typeof === "object"`), keine Plain-Functions. */
function isRenderableIcon(icon: unknown): icon is LucideIcon {
  if (icon == null) return false;
  if (typeof icon === "function") return true;
  return (
    typeof icon === "object" &&
    "$$typeof" in icon &&
    typeof (icon as { render?: unknown }).render === "function"
  );
}

/** Defensiv: niemals `<UndefinedIcon />` rendern (React #130). */
export function resolveLucideIcon(icon: LucideIcon | null | undefined): LucideIcon {
  return isRenderableIcon(icon) ? icon : HelpCircle;
}

type SafeLucideIconProps = SVGProps<SVGSVGElement> & {
  icon: LucideIcon | null | undefined;
};

export function SafeLucideIcon({ icon, className, ...rest }: SafeLucideIconProps) {
  const Icon = resolveLucideIcon(icon);
  return <Icon className={className} {...rest} />;
}
