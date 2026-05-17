type Tone = "closed" | "calm" | "watch" | "urgent";

const TONE_CLASS: Record<Tone, string> = {
  urgent:
    "border-rose-300/50 bg-rose-100 text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/15 dark:text-rose-200",
  watch:
    "border-amber-300/50 bg-amber-100 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-100",
  calm:
    "border-emerald-300/45 bg-emerald-100 text-emerald-800 dark:border-emerald-500/15 dark:bg-emerald-500/10 dark:text-emerald-200",
  closed:
    "border-slate-300/40 bg-slate-100 text-slate-700 dark:border-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300",
};

export function StaffingHintBadge({
  tone,
  label,
  tooltip,
  className = "",
}: {
  tone: Tone;
  label: string;
  tooltip: string;
  className?: string;
}) {
  if (!label.trim()) return null;
  return (
    <span
      title={tooltip ? `Tipp: ${tooltip}` : "Personal-Tipp für diesen Tag"}
      className={`inline-flex max-w-full truncate rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${TONE_CLASS[tone]} ${className}`}
    >
      {label}
    </span>
  );
}
