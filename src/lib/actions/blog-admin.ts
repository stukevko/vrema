"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { BlogPostCategory } from "@prisma/client";
import { sanitizeBlogHtml, slugifyTitle } from "@/lib/blog/blog-html";

async function requireSuperAdmin() {
  const session = await auth();
  const ok =
    session?.user?.role === "SUPER_ADMIN" || session?.user?.id === process.env.SUPER_ADMIN_USER_ID;
  if (!ok) redirect("/dashboard");
  return session;
}

const CATEGORIES = [BlogPostCategory.UPDATES, BlogPostCategory.TUTORIALS, BlogPostCategory.KNOWLEDGE] as const;

export async function createBlogPostAction(formData: FormData): Promise<string> {
  await requireSuperAdmin();

  const title = String(formData.get("title") ?? "").trim();
  let slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const teaser = String(formData.get("teaser") ?? "").trim();
  const content = sanitizeBlogHtml(String(formData.get("content") ?? ""));
  const categoryRaw = String(formData.get("category") ?? "");
  const youtubeRaw = String(formData.get("youtubeId") ?? "").trim();
  const published = formData.getAll("published").includes("true");

  if (!title || !teaser || !content) {
    throw new Error("Titel, Teaser und Inhalt sind Pflichtfelder.");
  }

  if (!CATEGORIES.includes(categoryRaw as BlogPostCategory)) {
    throw new Error("Ungültige Kategorie.");
  }
  const category = categoryRaw as BlogPostCategory;

  if (!slug) slug = slugifyTitle(title);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Slug: nur Kleinbuchstaben, Zahlen und Bindestriche.");
  }

  const youtubeId = youtubeRaw.length === 0 ? null : youtubeRaw;

  try {
    const created = await db.blogPost.create({
      data: {
        slug,
        title,
        teaser,
        content,
        category,
        youtubeId,
        published,
      },
    });

    revalidatePath("/blog");
    revalidatePath("/blog", "layout");
    revalidatePath(`/blog/${slug}`);
    return created.id;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("Dieser Slug ist bereits vergeben.");
    }
    throw e;
  }
}

export async function updateBlogPostAction(formData: FormData) {
  await requireSuperAdmin();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Keine Post-ID.");

  const title = String(formData.get("title") ?? "").trim();
  let slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const teaser = String(formData.get("teaser") ?? "").trim();
  const content = sanitizeBlogHtml(String(formData.get("content") ?? ""));
  const categoryRaw = String(formData.get("category") ?? "");
  const youtubeRaw = String(formData.get("youtubeId") ?? "").trim();
  const published = formData.getAll("published").includes("true");

  if (!title || !teaser || !content) {
    throw new Error("Titel, Teaser und Inhalt sind Pflichtfelder.");
  }
  if (!CATEGORIES.includes(categoryRaw as BlogPostCategory)) {
    throw new Error("Ungültige Kategorie.");
  }
  const category = categoryRaw as BlogPostCategory;

  if (!slug) slug = slugifyTitle(title);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Slug: nur Kleinbuchstaben, Zahlen und Bindestriche.");
  }

  const existing = await db.blogPost.findUnique({ where: { id }, select: { slug: true } });
  if (!existing) throw new Error("Eintrag nicht gefunden.");

  const youtubeId = youtubeRaw.length === 0 ? null : youtubeRaw;

  try {
    await db.blogPost.update({
      where: { id },
      data: {
        slug,
        title,
        teaser,
        content,
        category,
        youtubeId,
        published,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("Dieser Slug ist bereits vergeben.");
    }
    throw e;
  }

  revalidatePath("/blog");
  revalidatePath("/blog", "layout");
  revalidatePath(`/blog/${existing.slug}`);
  if (existing.slug !== slug) {
    revalidatePath(`/blog/${slug}`);
  }
}

export async function deleteBlogPostAction(id: string) {
  await requireSuperAdmin();
  const row = await db.blogPost.findUnique({ where: { id }, select: { slug: true } });
  if (!row) throw new Error("Eintrag nicht gefunden.");
  await db.blogPost.delete({ where: { id } });
  revalidatePath("/blog");
  revalidatePath("/blog", "layout");
  revalidatePath(`/blog/${row.slug}`);
}
