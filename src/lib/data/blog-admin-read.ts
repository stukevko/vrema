import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { BlogPost, BlogPostCategory } from "@prisma/client";

async function assertSuperAdmin() {
  const session = await auth();
  const ok =
    session?.user?.role === "SUPER_ADMIN" || session?.user?.id === process.env.SUPER_ADMIN_USER_ID;
  if (!ok) redirect("/dashboard");
  return session;
}

export type BlogAdminListRow = {
  id: string;
  slug: string;
  title: string;
  teaser: string;
  category: BlogPostCategory;
  youtubeId: string | null;
  published: boolean;
};

/** Server-only Leselogik (kein `"use server"`) — stabil für RSC / Production. */
export async function listBlogPostsForAdmin(): Promise<BlogAdminListRow[]> {
  await assertSuperAdmin();
  return db.blogPost.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      teaser: true,
      category: true,
      youtubeId: true,
      published: true,
    },
  });
}

export async function getBlogPostByIdForAdmin(id: string): Promise<BlogPost | null> {
  await assertSuperAdmin();
  return db.blogPost.findUnique({ where: { id } });
}
