import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import { addCommentForViewer } from "@/lib/community-server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "请先登录后发表评论" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "评论内容不能为空" }, { status: 400 });
  }

  const comment = await addCommentForViewer(id, currentUser, content);
  if (!comment) {
    return NextResponse.json({ error: "帖子不存在或当前不可见" }, { status: 404 });
  }

  return NextResponse.json({ comment }, { status: 201 });
}
