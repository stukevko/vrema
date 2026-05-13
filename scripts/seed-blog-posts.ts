/**
 * Idempotent: upsertet die drei Standard-Artikel anhand des Slugs.
 * Ausführen: `npm run blog:seed` (DATABASE_URL in `.env` im Projektroot)
 */
import { createScriptPrisma } from "./prisma-script-client";

const prisma = createScriptPrisma();

async function main() {
  for (const row of DEFAULT_BLOG_SEED_ROWS) {
    await prisma.blogPost.upsert({
      where: { slug: row.slug },
      create: {
        slug: row.slug,
        title: row.title,
        teaser: row.teaser,
        content: row.content,
        category: row.category,
        youtubeId: row.youtubeId,
        published: row.published,
      },
      update: {
        title: row.title,
        teaser: row.teaser,
        content: row.content,
        category: row.category,
        youtubeId: row.youtubeId,
        published: row.published,
      },
    });
    console.log("OK:", row.slug);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
