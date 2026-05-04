import { BlogPostCategory } from "@prisma/client";

export const BLOG_FORM_CATEGORIES: { value: BlogPostCategory; label: string }[] = [
  { value: BlogPostCategory.UPDATES, label: "Updates" },
  { value: BlogPostCategory.TUTORIALS, label: "Tutorials" },
  { value: BlogPostCategory.KNOWLEDGE, label: "Wissen" },
];
