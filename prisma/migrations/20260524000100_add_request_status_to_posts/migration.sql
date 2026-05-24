-- CreateEnum
CREATE TYPE "public"."RequestStatus" AS ENUM ('open', 'processing', 'resolved');

-- AlterTable
ALTER TABLE "public"."Post"
ADD COLUMN "requestStatus" "public"."RequestStatus";

-- Backfill existing request posts
UPDATE "public"."Post"
SET "requestStatus" = 'open'
WHERE "category" = 'request' AND "requestStatus" IS NULL;

-- CreateIndex
CREATE INDEX "Post_category_requestStatus_idx" ON "public"."Post"("category", "requestStatus");
