"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, Play, BookOpen } from "lucide-react";
import { BlogPostCategory } from "@prisma/client";
import type { PublicBlogCard } from "@/lib/actions/blog-public";
import { BLOG_CATEGORY_LABELS } from "@/lib/blog/types";

const FILTERS: { id: "all" | BlogPostCategory; label: string }[] = [
  { id: "all", label: "Alle" },
  { id: BlogPostCategory.UPDATES, label: BLOG_CATEGORY_LABELS.UPDATES },
  { id: BlogPostCategory.TUTORIALS, label: BLOG_CATEGORY_LABELS.TUTORIALS },
  { id: BlogPostCategory.KNOWLEDGE, label: BLOG_CATEGORY_LABELS.KNOWLEDGE },
];

function formatDate(iso: string) {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString("de-DE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function categoryBadgeClass(cat: BlogPostCategory) {
  switch (cat) {
    case BlogPostCategory.UPDATES:
      return "border-brand/25 bg-brand-soft text-brand dark:border-white/10 dark:bg-brand/22 dark:text-brand-foreground";
    case BlogPostCategory.TUTORIALS:
      return "border-warning/25 bg-warning-soft text-warning-foreground dark:border-white/10 dark:bg-warning/22";
    case BlogPostCategory.KNOWLEDGE:
      return "border-line bg-surface-muted text-foreground dark:border-white/10 dark:bg-surface-muted/55";
    default:
      return "border-line bg-surface-muted/85 text-foreground";
  }
}

export function BlogIndexClient({ posts }: { posts: PublicBlogCard[] }) {
  const [filter, setFilter] = useState<"all" | BlogPostCategory>("all");

  const filtered = useMemo(
    () => (filter === "all" ? posts : posts.filter((p) => p.category === filter)),
    [posts, filter]
  );

  return (
    <>
      {/* Hero – gleiche Token-Welt wie die Landing (bg-background, text-foreground, Brand-Gradient). */}
      <section className="relative isolate overflow-hidden border-b border-border bg-background">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-32 -z-10 h-72 bg-gradient-to-b from-brand/15 via-transparent to-transparent"
        />
        <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-12 sm:pb-16 sm:pt-16">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Product Journal</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
            VREMA Insights
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Updates, Tutorials und kuratiertes Wissen — transparent begleiten wir die Weiterentwicklung von VREMA.
          </p>

          <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Kategorien">
            {FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(f.id)}
                  className={`min-h-10 rounded-full border px-4 py-2 text-sm font-medium transition-colors active:scale-[0.98] ${
                    active
                      ? "border-brand bg-brand text-brand-foreground shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:border-brand/40 hover:text-foreground dark:bg-surface/70"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Card-Grid – auf surface-muted/30, damit Karten "anliegen" wie auf der Landing. */}
      <section className="bg-surface-muted/50 py-12 dark:bg-surface-muted/30">
        <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
          {filtered.map((post) => (
            <article key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-[1px] hover:border-brand/40 hover:shadow-md dark:border-white/[0.06] dark:bg-surface/70"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-brand/10 via-surface-muted to-card dark:from-brand/12 dark:via-surface/30 dark:to-surface/70">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <span className="inline-flex rounded-2xl border border-border bg-card/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground shadow-sm dark:bg-surface/80">
                        VREMA
                      </span>
                      {post.kind === "video" && (
                        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/95 px-3 py-1 text-xs font-medium text-foreground shadow-sm dark:bg-surface/80">
                          <Play className="h-3.5 w-3.5 text-brand" aria-hidden />
                          Video
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <span
                    className={`inline-flex w-fit rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${categoryBadgeClass(post.category)}`}
                  >
                    {BLOG_CATEGORY_LABELS[post.category]}
                  </span>
                  <h2 className="mt-3 text-lg font-bold leading-snug tracking-tight text-foreground group-hover:text-brand md:text-xl">
                    {post.title}
                  </h2>
                  <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">{post.teaser}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground/80">
                    <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <time dateTime={post.date}>{formatDate(post.date)}</time>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="mx-auto mt-2 max-w-md px-4">
            <div className="rounded-2xl border border-border bg-card/70 px-6 py-10 text-center shadow-sm dark:border-white/[0.06] dark:bg-surface/50">
              <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface-muted/70 text-muted-foreground dark:bg-surface/80">
                <BookOpen className="h-5 w-5" aria-hidden />
              </div>
              <p className="text-sm font-semibold text-foreground">Noch keine Beiträge in dieser Kategorie</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Schau in Kürze nochmal vorbei – unser Redaktions-Team füllt die Insights laufend mit neuen Inhalten.
              </p>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
