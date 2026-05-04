"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, Play } from "lucide-react";
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
      return "border-primary/30 bg-primary/10 text-primary";
    case BlogPostCategory.TUTORIALS:
      return "border-sky-200 bg-sky-50 text-sky-800";
    case BlogPostCategory.KNOWLEDGE:
      return "border-violet-200 bg-violet-50 text-violet-800";
    default:
      return "border-border bg-muted text-foreground";
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
      <div className="mx-auto w-full max-w-7xl px-4 pb-6 pt-4 sm:pb-8 sm:pt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Product Journal</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">VREMA Insights</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Updates, Tutorials und kuratiertes Wissen — transparent begleiten wir die Weiterentwicklung von VREMA.
        </p>

        <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Kategorien">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`min-h-10 rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-[0.98] ${
                filter === f.id
                  ? "border-primary bg-primary text-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/15 hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 pb-16 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
        {filtered.map((post) => (
          <article key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="group flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition-all hover:border-primary/25 hover:shadow-[0_24px_56px_rgba(0,0,0,0.07)]"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-muted to-card">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <span className="inline-flex rounded-2xl border border-border bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground shadow-sm">
                      VREMA
                    </span>
                    {post.kind === "video" && (
                      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-white/95 px-3 py-1 text-xs font-medium text-foreground shadow-sm">
                        <Play className="h-3.5 w-3.5 text-primary" aria-hidden />
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
                <h2 className="mt-3 text-lg font-bold leading-snug tracking-tight text-foreground group-hover:text-primary md:text-xl">
                  {post.title}
                </h2>
                <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">{post.teaser}</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                </div>
              </div>
            </Link>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mx-auto max-w-7xl px-4 pb-16 text-center text-sm text-muted-foreground">
          Keine Beiträge in dieser Kategorie. Super-Admin: fehlt der Datenimport?{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">npm run blog:seed</code>
        </p>
      )}
    </>
  );
}
