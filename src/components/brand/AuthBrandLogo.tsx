import Image from "next/image";

/** Einheitliche, große Markenzeile auf Login, Register, Passwort-Flows & Partner-Login. */
export function AuthBrandLogo() {
  return (
    <div className="flex flex-col items-center">
      <Image
        src="/vrema_logo.png"
        alt="VREMA"
        width={520}
        height={146}
        priority
        className="h-28 w-auto max-w-[min(100%,24rem)] object-contain object-center md:h-32 lg:h-36"
      />
    </div>
  );
}
