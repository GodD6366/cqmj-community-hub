import { NextResponse } from "next/server";
import { getCurrentUserFromCookie, isAdminUser } from "@/lib/auth-server";
import { listServiceTicketsForAdmin } from "@/lib/resident-server";

export async function GET() {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  if (!isAdminUser(currentUser)) {
    return NextResponse.json({ error: "只有管理员可以访问后台" }, { status: 403 });
  }

  const serviceTickets = await listServiceTicketsForAdmin();
  return NextResponse.json({ serviceTickets });
}
