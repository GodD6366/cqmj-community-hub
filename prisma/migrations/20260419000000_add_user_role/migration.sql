-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('user', 'admin');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN "role" "public"."UserRole";

-- Backfill
UPDATE "public"."User" SET "role" = 'user' WHERE "role" IS NULL;

-- Defaults and constraints
ALTER TABLE "public"."User" ALTER COLUMN "role" SET DEFAULT 'user';
ALTER TABLE "public"."User" ALTER COLUMN "role" SET NOT NULL;
