import { votePollForViewer } from "@/lib/resident-server";
import { skillJson, withSkillAuth } from "@/lib/skill-api";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  return withSkillAuth(request, async (_request, { viewer }) => {
    const body = await request.json().catch(() => null);
    const optionId = typeof body?.optionId === "string" ? body.optionId : "";
    if (!optionId) {
      return skillJson({ error: "请选择一个投票选项" }, { status: 400 });
    }

    try {
      await votePollForViewer(id, optionId, viewer);
      return skillJson({ ok: true });
    } catch (error) {
      if (error instanceof Error && error.message === "POLL_NOT_FOUND") {
        return skillJson({ error: "投票不存在" }, { status: 404 });
      }
      if (error instanceof Error && error.message === "POLL_CLOSED") {
        return skillJson({ error: "该投票已经结束" }, { status: 409 });
      }
      if (error instanceof Error && error.message === "POLL_ALREADY_VOTED") {
        return skillJson({ error: "你已经参与过这个投票了" }, { status: 409 });
      }
      if (error instanceof Error && error.message === "POLL_OPTION_NOT_FOUND") {
        return skillJson({ error: "投票选项不存在" }, { status: 404 });
      }
      return skillJson({ error: "参与投票失败" }, { status: 500 });
    }
  });
}
