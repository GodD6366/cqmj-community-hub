import { toggleFavoriteForViewer } from "@/lib/community-server";
import { skillJson, withSkillAuth } from "@/lib/skill-api";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  return withSkillAuth(request, async (_request, { viewer }) => {
    try {
      const result = await toggleFavoriteForViewer(id, viewer);
      return skillJson(result);
    } catch (error) {
      if (error instanceof Error && error.message === "POST_NOT_FOUND") {
        return skillJson({ error: "帖子不存在或当前不可见" }, { status: 404 });
      }
      return skillJson({ error: "收藏失败" }, { status: 500 });
    }
  });
}
