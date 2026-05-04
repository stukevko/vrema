"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BlogPost, BlogPostCategory } from "@prisma/client";
import { Loader2, Plus, Trash2, Pencil, BookOpen } from "lucide-react";
import { BLOG_FORM_CATEGORIES } from "@/lib/blog/category-options";
import { BLOG_YOUTUBE_MARKER } from "@/lib/blog/blog-html";
import {
  createBlogPostAction,
  deleteBlogPostAction,
  updateBlogPostAction,
} from "@/lib/actions/blog-admin";

type ListRow = {
  id: string;
  slug: string;
  title: string;
  teaser: string;
  category: BlogPostCategory;
  youtubeId: string | null;
  published: boolean;
};

export function BlogAdminPanel({
  posts,
  editingPost,
  isNew,
}: {
  posts: ListRow[];
  editingPost: BlogPost | null;
  isNew: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const mode = isNew ? "new" : editingPost ? "edit" : "list";

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        if (mode === "new") {
          const id = await createBlogPostAction(fd);
          router.replace(`/dashboard/super-admin/blog?edit=${id}`);
          router.refresh();
          return;
        }
        if (mode === "edit" && editingPost) {
          await updateBlogPostAction(fd);
          router.refresh();
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
      }
    });
  };

  const onDelete = (id: string) => {
    if (!confirm("Diesen Blog-Eintrag wirklich löschen?")) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteBlogPostAction(id);
        router.replace("/dashboard/super-admin/blog");
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Löschen fehlgeschlagen.");
      }
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-1 sm:px-0">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Super Admin</p>
        <h1 className="mt-1 flex items-center gap-2 text-xl font-bold sm:text-2xl">
          <BookOpen className="h-6 w-6 shrink-0 text-muted-foreground" aria-hidden />
          Blog-Manager
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Artikel veröffentlichen, bearbeiten und YouTube-ID setzen. Video im Fließtext: Platzhalter{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">{BLOG_YOUTUBE_MARKER}</code> im HTML einfügen.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/dashboard/super-admin/blog"
            className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${mode === "list" ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card hover:bg-muted/50"}`}
          >
            Alle Einträge
          </Link>
          <Link
            href="/dashboard/super-admin/blog?new=1"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Neuer Artikel
          </Link>
          <Link href="/dashboard/partners" className="rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
            ← Vertriebspartner
          </Link>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      {(mode === "new" || mode === "edit") && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-[0_20px_50px_rgba(0,0,0,0.04)] sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            {mode === "new" ? "Neuer Beitrag" : "Beitrag bearbeiten"}
          </h2>
          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            {mode === "edit" && editingPost && <input type="hidden" name="id" value={editingPost.id} />}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Titel
                </label>
                <input
                  name="title"
                  required
                  defaultValue={editingPost?.title ?? ""}
                  className="w-full rounded-xl border border-border bg-white px-3 py-3 text-sm text-foreground focus:border-primary/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Slug (URL)
                </label>
                <input
                  name="slug"
                  defaultValue={editingPost?.slug ?? ""}
                  placeholder="auto-aus-titel"
                  className="w-full rounded-xl border border-border bg-white px-3 py-3 text-sm text-foreground focus:border-primary/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Kategorie
                </label>
                <select
                  name="category"
                  required
                  defaultValue={editingPost?.category ?? "UPDATES"}
                  className="w-full rounded-xl border border-border bg-white px-3 py-3 text-sm text-foreground focus:border-primary/40 focus:outline-none"
                >
                  {BLOG_FORM_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  YouTube-Video-ID (optional)
                </label>
                <input
                  name="youtubeId"
                  defaultValue={editingPost?.youtubeId ?? ""}
                  placeholder="z. B. dQw4w9WgXcQ"
                  className="w-full rounded-xl border border-border bg-white px-3 py-3 text-sm text-foreground focus:border-primary/40 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Teaser (Karten-Vorschau)
                </label>
                <textarea
                  name="teaser"
                  required
                  rows={3}
                  defaultValue={editingPost?.teaser ?? ""}
                  className="w-full rounded-xl border border-border bg-white px-3 py-3 text-sm text-foreground focus:border-primary/40 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Inhalt (HTML)
                </label>
                <textarea
                  name="content"
                  required
                  rows={16}
                  defaultValue={editingPost?.content ?? ""}
                  className="w-full rounded-xl border border-border bg-white px-3 py-3 font-mono text-xs leading-relaxed text-foreground focus:border-primary/40 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <input
                  type="checkbox"
                  name="published"
                  value="true"
                  id="published"
                  defaultChecked={editingPost?.published ?? false}
                  className="h-4 w-4 rounded border-border"
                />
                <input type="hidden" name="published" value="false" />
                <label htmlFor="published" className="text-sm text-foreground">
                  Veröffentlicht (sichtbar auf /blog)
                </label>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-foreground ring-1 ring-inset ring-white/20 transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Speichern
              </button>
              {mode === "edit" && editingPost && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => onDelete(editingPost.id)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-red-200 px-5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Löschen
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      {mode === "list" && (
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-foreground">Alle Einträge ({posts.length})</h2>
          </div>
          <ul className="divide-y divide-border">
            {posts.map((p) => (
              <li key={p.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{p.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    /{p.slug} · {p.category}
                    {p.published ? " · veröffentlicht" : " · Entwurf"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href={`/blog/${p.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center rounded-xl border border-border px-3 text-sm text-muted-foreground hover:bg-muted/50"
                  >
                    Vorschau
                  </Link>
                  <Link
                    href={`/dashboard/super-admin/blog?edit=${p.id}`}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-primary/10 px-3 text-sm font-medium text-primary hover:bg-primary/15"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    Bearbeiten
                  </Link>
                </div>
              </li>
            ))}
          </ul>
          {posts.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              Noch keine Einträge. Terminal:{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[11px]">npm run blog:seed</code>
            </p>
          )}
        </section>
      )}
    </div>
  );
}
