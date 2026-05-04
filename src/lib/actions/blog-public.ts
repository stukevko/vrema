"use server";

import { db } from "@/lib/db";
import type { BlogPost, BlogPostCategory } from "@prisma/client";
import { BLOG_YOUTUBE_MARKER } from "@/lib/blog/blog-html";

export type PublicBlogCard = {
  slug: string;
  title: string;
  teaser: string;
  date: string;
  category: BlogPostCategory;
  kind: "article" | "video";
};

function rowToCard(row: BlogPost): PublicBlogCard {
  const hasVideoMarker = row.content.includes(BLOG_YOUTUBE_MARKER);
  const yt = row.youtubeId?.trim();
  const kind: "article" | "video" = Boolean(yt) || hasVideoMarker ? "video" : "article";
  return {
    slug: row.slug,
    title: row.title,
    teaser: row.teaser,
    date: row.createdAt.toISOString().slice(0, 10),
    category: row.category,
    kind,
  };
}

export async function getPublishedBlogPostsForCards(): Promise<PublicBlogCard[]> {
  const rows = await db.blogPost.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(rowToCard);
}

export async function getPublishedBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  return db.blogPost.findFirst({
    where: { slug, published: true },
  });
}

export async function getAllPublishedBlogSlugs(): Promise<string[]> {
  const rows = await db.blogPost.findMany({
    where: { published: true },
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}
