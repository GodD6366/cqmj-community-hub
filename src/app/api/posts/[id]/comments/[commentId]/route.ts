import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import { updateCommentForViewer } from "@/lib/community-server";

interface RouteParams {
  params: Promise<{ id: string; commentId: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "请先登录后编辑评论" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "评论内容不能为空" }, { status: 400 });
  }

  const { id, commentId } = await params;
  const result = await updateCommentForViewer(id, commentId, currentUser, content);

  if (result.status === "not_found") {
    return NextResponse.json({ error: "评论不存在" }, { status: 404 });
  }
  if (result.status === "forbidden") {
    return NextResponse.json({ error: "只能编辑自己的评论" }, { status: 403 });
  }

  return NextResponse.json({ comment: result.comment });
}
