import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { createNotificationRecord } from "@/lib/resident-server";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params; // postId
  const { matchId } = await request.json().catch(() => ({}));
  if (!matchId) return NextResponse.json({ error: "Missing matchId" }, { status: 400 });

  const match = await prisma.postSkillMatch.findUnique({
    where: { id: matchId },
    include: {
      post: true,
      skill: true,
    }
  });

  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.postId !== id) return NextResponse.json({ error: "Post mismatch" }, { status: 400 });
  if (match.post.authorId !== currentUser.id) return NextResponse.json({ error: "Only post author can notify" }, { status: 403 });

  if (match.notifiedAt) {
    return NextResponse.json({ error: "Already notified" }, { status: 400 });
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.postSkillMatch.update({
      where: { id: matchId },
      data: { notifiedAt: new Date() }
    });

    await createNotificationRecord(tx, {
      userId: match.skill.userId,
      type: "system",
      title: "有人需要你的技能帮助！",
      body: `邻居 ${currentUser.nickname} 的求助帖可能需要你的【${match.skill.title}】技能，去看看吧。`,
      href: `/posts/${id}`
    });
  });

  return NextResponse.json({ ok: true });
}
