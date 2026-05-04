import type { BlogPostCategory } from "@prisma/client";

export type { BlogPostCategory };

export const BLOG_CATEGORY_LABELS: Record<BlogPostCategory, string> = {
  UPDATES: "Updates",
  TUTORIALS: "Tutorials",
  KNOWLEDGE: "Wissen",
};
