import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Calendar } from "lucide-react";
import { getPublishedBlogPostBySlug } from "@/lib/actions/blog-public";
import { BLOG_CATEGORY_LABELS } from "@/lib/blog/types";
import { ArticleEndCta } from "@/components/blog/ArticleEndCta";
import { BlogArticleBody } from "@/components/blog/BlogArticleBody";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.teaser,
  };
}

function formatDate(d: Date) {
  const iso = d.toISOString().slice(0, 10);
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

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto w-full max-w-3xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
      <Link
        href="/blog"
        className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
        Zur Übersicht
      </Link>

      <header className="public-card mt-6 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 font-semibold uppercase tracking-wide text-slate-900">
            {BLOG_CATEGORY_LABELS[post.category]}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" aria-hidden />
            <time dateTime={post.createdAt.toISOString()}>{formatDate(post.createdAt)}</time>
          </span>
        </div>
        <h1 className="mt-4 text-3xl font-bold leading-[1.15] tracking-tight text-slate-900 sm:text-4xl md:text-[2.5rem]">
          {post.title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">{post.teaser}</p>
      </header>

      <div className="public-card mt-6 rounded-2xl p-6 sm:p-8">
        <div
          className={[
            "prose prose-slate max-w-none prose-lg leading-[1.75] prose-headings:scroll-mt-24 prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900",
            "prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-slate-900",
            "prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline",
            "prose-ul:my-4 prose-ol:my-4 prose-li:my-1",
          ].join(" ")}
        >
          <BlogArticleBody html={post.content} youtubeId={post.youtubeId} videoCaption={post.title} />
        </div>
      </div>

      <ArticleEndCta />
    </article>
  );
}
