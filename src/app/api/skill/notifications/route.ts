import { skillJson, withSkillAuth, parseLimit } from "@/lib/skill-api";
import { listNotificationsForViewer, markNotificationsReadForViewer } from "@/lib/resident-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withSkillAuth(request, async (req, { viewer }) => {
    const { searchParams } = new URL(req.url);
    const limit = parseLimit(searchParams.get("limit"), 30, 100);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    
    let notifications = await listNotificationsForViewer(viewer.id, limit);
    if (unreadOnly) {
      notifications = notifications.filter(n => !n.readAt);
    }
    return skillJson({ notifications });
  });
}

export async function POST(request: Request) {
  return withSkillAuth(request, async (req, { viewer }) => {
    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? body.ids : undefined;
    const count = await markNotificationsReadForViewer(viewer.id, ids);
    return skillJson({ markedCount: count });
  });
}
