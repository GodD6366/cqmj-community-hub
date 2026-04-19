import { NextResponse } from "next/server";
import { getCurrentAdminFromCookie } from "@/lib/admin-auth";
import { listPostsForAdmin } from "@/lib/community-server";

export async function GET() {
  const admin = await getCurrentAdminFromCookie();
  if (!admin) {
    return NextResponse.json({ error: "请先登录管理员后台" }, { status: 401 });
  }

  const posts = await listPostsForAdmin();
  return NextResponse.json({ posts });
}
