-- CreateTable
CREATE TABLE "LearningMaterial" (
    "id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LearningMaterial_field_url_key" ON "LearningMaterial"("field", "url");

-- CreateIndex
CREATE INDEX "LearningMaterial_field_createdAt_idx" ON "LearningMaterial"("field", "createdAt");

-- CreateIndex
CREATE INDEX "LearningMaterial_type_idx" ON "LearningMaterial"("type");
