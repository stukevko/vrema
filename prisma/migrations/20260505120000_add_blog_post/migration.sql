-- CreateEnum
CREATE TYPE "BlogPostCategory" AS ENUM ('UPDATES', 'TUTORIALS', 'KNOWLEDGE');

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "teaser" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "BlogPostCategory" NOT NULL,
    "youtubeId" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

CREATE INDEX "BlogPost_published_createdAt_idx" ON "BlogPost"("published", "createdAt");

CREATE INDEX "BlogPost_category_idx" ON "BlogPost"("category");
