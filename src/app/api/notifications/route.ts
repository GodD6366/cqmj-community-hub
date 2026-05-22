import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import {
  countUnreadNotificationsForViewer,
  listNotificationsForViewer,
  markNotificationsReadForViewer,
} from "@/lib/resident-server";

export async function GET() {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ notifications: [], unreadNotificationCount: 0 });
  }

  const [notifications, unreadNotificationCount] = await Promise.all([
    listNotificationsForViewer(currentUser.id),
    countUnreadNotificationsForViewer(currentUser.id),
  ]);

  return NextResponse.json({ notifications, unreadNotificationCount });
}

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((value: unknown): value is string => typeof value === "string" && value.length > 0)
    : undefined;
  const count = await markNotificationsReadForViewer(currentUser.id, ids);

  return NextResponse.json({ ok: true, count });
}
