import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { createNotificationRecord } from "@/lib/resident-server";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  const skill = await prisma.neighborSkill.findUnique({
    where: { id }
  });

  if (!skill) return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  if (skill.userId === currentUser.id) return NextResponse.json({ error: "Cannot contact yourself" }, { status: 400 });

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await createNotificationRecord(tx, {
      userId: skill.userId,
      type: "system",
      title: "有人想获取您的技能帮助",
      body: `邻居 ${currentUser.nickname} (房号：${currentUser.roomNumber || "未知"}) 浏览了您的技能【${skill.title}】并希望与您取得联系，请在社区遇到时或通过其他方式留意。`,
      href: "/neighbors"
    });
  });

  return NextResponse.json({ ok: true });
}
