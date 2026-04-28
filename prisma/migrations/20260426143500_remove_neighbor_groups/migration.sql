DELETE FROM "public"."Notification"
WHERE "type" = 'group'
   OR (
    "type" = 'poll'
    AND (
      "title" LIKE '%小区绿化改造建议征集%'
      OR "body" LIKE '%小区绿化改造建议征集%'
      OR "title" LIKE '%关于物业服务时间的意见收集%'
      OR "body" LIKE '%关于物业服务时间的意见收集%'
    )
  );

DELETE FROM "public"."Poll"
WHERE "authorId" IS NULL
  AND "title" IN ('小区绿化改造建议征集', '关于物业服务时间的意见收集');

DROP TABLE "public"."GroupMembership";

DROP TABLE "public"."NeighborGroup";
