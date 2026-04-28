-- CreateEnum
CREATE TYPE "public"."PollStatus" AS ENUM ('active', 'closed');

-- CreateEnum
CREATE TYPE "public"."ServiceTicketCategory" AS ENUM ('repair', 'complaint', 'cleaning', 'facility', 'other');

-- CreateEnum
CREATE TYPE "public"."ServiceTicketStatus" AS ENUM ('open', 'processing', 'resolved');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('comment', 'favorite', 'poll', 'ticket', 'group', 'system');

-- CreateTable
CREATE TABLE "public"."Poll" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorId" TEXT,
    "status" "public"."PollStatus" NOT NULL DEFAULT 'active',
    "endsAt" TIMESTAMP(3),
    "totalVotes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PollOption" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "voteCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PollOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PollVote" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PollVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NeighborGroup" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "lastActivityText" TEXT NOT NULL,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NeighborGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GroupMembership" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ServiceTicket" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "public"."ServiceTicketCategory" NOT NULL,
    "status" "public"."ServiceTicketStatus" NOT NULL DEFAULT 'open',
    "authorName" TEXT NOT NULL,
    "roomNumber" TEXT,
    "authorId" TEXT,
    "assigneeNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Poll_status_createdAt_idx" ON "public"."Poll"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Poll_authorId_idx" ON "public"."Poll"("authorId");

-- CreateIndex
CREATE INDEX "PollOption_pollId_sortOrder_idx" ON "public"."PollOption"("pollId", "sortOrder");

-- CreateIndex
CREATE INDEX "PollVote_optionId_idx" ON "public"."PollVote"("optionId");

-- CreateIndex
CREATE INDEX "PollVote_userId_idx" ON "public"."PollVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PollVote_pollId_userId_key" ON "public"."PollVote"("pollId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "NeighborGroup_slug_key" ON "public"."NeighborGroup"("slug");

-- CreateIndex
CREATE INDEX "NeighborGroup_memberCount_lastActivityAt_idx" ON "public"."NeighborGroup"("memberCount", "lastActivityAt");

-- CreateIndex
CREATE INDEX "GroupMembership_userId_idx" ON "public"."GroupMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMembership_groupId_userId_key" ON "public"."GroupMembership"("groupId", "userId");

-- CreateIndex
CREATE INDEX "ServiceTicket_status_createdAt_idx" ON "public"."ServiceTicket"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceTicket_authorId_idx" ON "public"."ServiceTicket"("authorId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "public"."Notification"("userId", "readAt", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."Poll" ADD CONSTRAINT "Poll_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PollOption" ADD CONSTRAINT "PollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "public"."Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PollVote" ADD CONSTRAINT "PollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "public"."Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PollVote" ADD CONSTRAINT "PollVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "public"."PollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PollVote" ADD CONSTRAINT "PollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupMembership" ADD CONSTRAINT "GroupMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."NeighborGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupMembership" ADD CONSTRAINT "GroupMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceTicket" ADD CONSTRAINT "ServiceTicket_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
