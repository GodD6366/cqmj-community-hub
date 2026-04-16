import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import { reportPostForViewer } from "@/lib/community-server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "请先登录后举报" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const reason = typeof body?.reason === "string" ? body.reason.trim() : undefined;
  const ok = await reportPostForViewer(id, currentUser.id, reason);
  if (!ok) {
    return NextResponse.json({ error: "帖子不存在或当前不可见" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
