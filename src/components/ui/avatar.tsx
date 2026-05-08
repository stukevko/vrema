"use client";

type AvatarProps = {
  src?: string | null;
  alt?: string;
  fallback: string;
  className?: string;
  fallbackClassName?: string;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Avatar({ src, alt, fallback, className, fallbackClassName }: AvatarProps) {
  return (
    <span className={cx("relative inline-flex h-9 w-9 shrink-0 overflow-hidden rounded-full", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt ?? fallback} className="h-full w-full object-cover" />
      ) : (
        <span
          className={cx(
            "inline-flex h-full w-full items-center justify-center text-[11px] font-semibold text-white",
            "bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500",
            fallbackClassName
          )}
        >
          {fallback}
        </span>
      )}
    </span>
  );
}
