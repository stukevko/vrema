import { getPublishedBlogPostsForCards } from "@/lib/actions/blog-public";
import { BlogIndexClient } from "@/components/blog/BlogIndexClient";

/** DB kann beim Build fehlen — kein statisches Pre-Render erzwingen. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BlogPage() {
  const posts = await getPublishedBlogPostsForCards();
  return <BlogIndexClient posts={posts} />;
}
