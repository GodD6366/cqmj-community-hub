import { reportPostForViewer } from "@/lib/community-server";
import { skillJson, withSkillAuth } from "@/lib/skill-api";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  return withSkillAuth(request, async (_request, { viewer }) => {
    const body = await request.json().catch(() => null);
    const reason = typeof body?.reason === "string" && body.reason.trim() ? body.reason.trim() : undefined;
    const reported = await reportPostForViewer(id, viewer, reason);
    if (!reported) {
      return skillJson({ error: "帖子不存在或当前不可见" }, { status: 404 });
    }
    return skillJson({ ok: true });
  });
}
