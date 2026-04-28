import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import { countUnreadNotificationsForViewer, listNotificationsForViewer } from "@/lib/resident-server";

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
