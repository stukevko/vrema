import Link from "next/link";

export default function TerminalIndexPage() {
  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#141414] p-6 text-center">
        <p className="text-xs font-mono uppercase tracking-widest text-white/40 mb-2">Vrema Terminal</p>
        <h1 className="text-xl font-bold mb-2">Terminal an Firma binden</h1>
        <p className="text-sm text-white/50 mb-5">
          Öffne das Terminal über die Firmen-URL, z. B. <span className="font-mono">/terminal/dein-slug</span>.
        </p>
        <Link href="/" className="inline-block rounded-xl bg-[#22c55e] px-4 py-2 text-sm font-bold text-black">
          Zur Startseite
        </Link>
      </div>
    </div>
  );
}
