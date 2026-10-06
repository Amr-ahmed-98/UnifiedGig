-- CreateTable
CREATE TABLE "FollowProfile" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "headline" TEXT,
    "postsAbout" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FollowProfile_url_key" ON "FollowProfile"("url");

-- CreateIndex
CREATE INDEX "FollowProfile_platform_idx" ON "FollowProfile"("platform");

-- CreateIndex
CREATE INDEX "FollowProfile_createdAt_idx" ON "FollowProfile"("createdAt");
