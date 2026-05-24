-- CreateEnum
CREATE TYPE "public"."NeighborSkillCategory" AS ENUM ('computer_repair', 'bicycle_repair', 'photography', 'pet_care', 'tutoring', 'cooking', 'gardening', 'tool_sharing', 'home_repair', 'errand', 'other');

-- CreateTable
CREATE TABLE "public"."NeighborSkill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "public"."NeighborSkillCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "availability" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NeighborSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PostSkillMatch" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "reasons" TEXT NOT NULL DEFAULT '[]',
    "source" TEXT NOT NULL DEFAULT 'rules',
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostSkillMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NeighborSkill_category_active_idx" ON "public"."NeighborSkill"("category", "active");

-- CreateIndex
CREATE INDEX "NeighborSkill_userId_active_idx" ON "public"."NeighborSkill"("userId", "active");

-- CreateIndex
CREATE INDEX "NeighborSkill_createdAt_idx" ON "public"."NeighborSkill"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PostSkillMatch_postId_skillId_key" ON "public"."PostSkillMatch"("postId", "skillId");

-- CreateIndex
CREATE INDEX "PostSkillMatch_postId_score_idx" ON "public"."PostSkillMatch"("postId", "score");

-- CreateIndex
CREATE INDEX "PostSkillMatch_userId_notifiedAt_idx" ON "public"."PostSkillMatch"("userId", "notifiedAt");

-- AddForeignKey
ALTER TABLE "public"."NeighborSkill" ADD CONSTRAINT "NeighborSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostSkillMatch" ADD CONSTRAINT "PostSkillMatch_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostSkillMatch" ADD CONSTRAINT "PostSkillMatch_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "public"."NeighborSkill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostSkillMatch" ADD CONSTRAINT "PostSkillMatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
