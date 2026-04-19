import { NextResponse } from "next/server";
import { getCurrentAdminFromCookie } from "@/lib/admin-auth";
import { deletePostForAdmin } from "@/lib/community-server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(_: Request, { params }: RouteParams) {
  const admin = await getCurrentAdminFromCookie();
  if (!admin) {
    return NextResponse.json({ error: "请先登录管理员后台" }, { status: 401 });
  }

  const { id } = await params;
  const ok = await deletePostForAdmin(id);
  if (!ok) {
    return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
