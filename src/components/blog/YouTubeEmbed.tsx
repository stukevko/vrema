/**
 * Responsives 16:9-Embed (YouTube) oder Platzhalter ohne Video-ID.
 */
export function YouTubeEmbed({
  videoId,
  title,
}: {
  videoId?: string | null;
  title: string;
}) {
  if (!videoId) {
    return (
      <figure className="my-8 not-prose w-full">
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-dashed border-border bg-gradient-to-br from-muted/80 to-card shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-white/90 shadow-sm">
              <svg viewBox="0 0 24 24" className="h-7 w-7 text-muted-foreground" fill="currentColor" aria-hidden>
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">YouTube-Video</p>
            <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
              Platzhalter — hier erscheint bald der erste VREMA-Clip zum Release.
            </p>
          </div>
        </div>
        <figcaption className="mt-2 text-center text-sm text-muted-foreground">{title}</figcaption>
      </figure>
    );
  }

  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0`;

  return (
    <figure className="my-8 not-prose w-full">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
        <iframe
          src={src}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <figcaption className="mt-2 text-center text-sm text-muted-foreground">{title}</figcaption>
    </figure>
  );
}
