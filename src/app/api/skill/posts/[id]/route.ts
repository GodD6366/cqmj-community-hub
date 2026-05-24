import { getPostForViewer } from "@/lib/community-server";
import { skillJson, withSkillAuth } from "@/lib/skill-api";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  return withSkillAuth(request, async (_request, { viewer }) => {
    const post = await getPostForViewer(id, viewer);
    if (!post) {
      return skillJson({ error: "帖子不存在或当前不可见" }, { status: 404 });
    }
    return skillJson({ post });
  });
}
