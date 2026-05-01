import Link from "next/link";

export default function TerminalIndexPage() {
  return (
    <div className="min-h-screen bg-background text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 text-center shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <p className="text-xs font-sans uppercase tracking-widest text-white/40 mb-2">Vrema Terminal</p>
        <h1 className="text-xl font-bold mb-2">Terminal an Firma binden</h1>
        <p className="text-sm text-white/50 mb-5">
          Öffne das Terminal über die Firmen-URL, z. B. <span className="font-sans">/terminal/dein-slug</span>.
        </p>
        <Link
          href="/"
          className="inline-block rounded-xl bg-primary px-4 py-2 text-sm font-bold text-black hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(150,255,180,0.3)] transition-all"
        >
          Zur Startseite
        </Link>
      </div>
    </div>
  );
}
