import { addCommentForViewer } from "@/lib/community-server";
import { skillJson, withSkillAuth } from "@/lib/skill-api";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  return withSkillAuth(request, async (_request, { viewer }) => {
    const body = await request.json().catch(() => null);
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    if (!content) {
      return skillJson({ error: "评论内容不能为空" }, { status: 400 });
    }

    const comment = await addCommentForViewer(id, viewer, content);
    if (!comment) {
      return skillJson({ error: "帖子不存在或当前不可见" }, { status: 404 });
    }

    return skillJson({ comment }, { status: 201 });
  });
}
