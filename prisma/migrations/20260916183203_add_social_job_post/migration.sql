-- CreateTable
CREATE TABLE "SocialJobPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authorName" TEXT,
    "authorTitle" TEXT,
    "authorImageUrl" TEXT,
    "description" TEXT,
    "salary" TEXT,
    "location" TEXT,
    "remote" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[],
    "recruiterContact" TEXT,
    "imageUrl" TEXT,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'linkedin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialJobPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialJobPost_url_key" ON "SocialJobPost"("url");

-- CreateIndex
CREATE INDEX "SocialJobPost_expiresAt_idx" ON "SocialJobPost"("expiresAt");

-- CreateIndex
CREATE INDEX "SocialJobPost_remote_idx" ON "SocialJobPost"("remote");

-- CreateIndex
CREATE INDEX "SocialJobPost_createdAt_idx" ON "SocialJobPost"("createdAt");
