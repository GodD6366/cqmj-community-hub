ALTER TYPE "public"."NotificationType" RENAME TO "NotificationType_old";

CREATE TYPE "public"."NotificationType" AS ENUM ('comment', 'favorite', 'poll', 'ticket', 'system');

ALTER TABLE "public"."Notification"
  ALTER COLUMN "type" TYPE "public"."NotificationType"
  USING ("type"::text::"public"."NotificationType");

DROP TYPE "public"."NotificationType_old";
