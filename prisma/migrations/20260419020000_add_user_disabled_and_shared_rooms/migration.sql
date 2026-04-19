ALTER TABLE "public"."User" ADD COLUMN "disabledAt" TIMESTAMP(3);

DROP INDEX "public"."User_roomNumber_key";

CREATE INDEX "User_roomNumber_idx" ON "public"."User"("roomNumber");
