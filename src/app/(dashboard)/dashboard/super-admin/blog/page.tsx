import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getBlogPostByIdForAdmin, listBlogPostsForAdmin } from "@/lib/data/blog-admin-read";
import { BlogAdminPanel } from "@/components/super-admin/BlogAdminPanel";

export default async function SuperAdminBlogPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; new?: string }>;
}) {
  const session = await auth();
  const isSuperAdmin =
    session?.user?.role === "SUPER_ADMIN" || session?.user?.id === process.env.SUPER_ADMIN_USER_ID;

  if (!isSuperAdmin) redirect("/dashboard");

  const sp = await searchParams;
  const editId = typeof sp.edit === "string" ? sp.edit : undefined;
  const isNew = sp.new === "1" || sp.new === "true";

  const posts = await listBlogPostsForAdmin();
  const editingPost = editId && !isNew ? await getBlogPostByIdForAdmin(editId) : null;

  if (editId && !isNew && !editingPost) {
    redirect("/dashboard/super-admin/blog");
  }

  return <BlogAdminPanel posts={posts} editingPost={editingPost} isNew={isNew} />;
}
