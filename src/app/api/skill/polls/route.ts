import { createPollForViewer, listPollsForViewer } from "@/lib/resident-server";
import { parseLimit, skillJson, withSkillAuth } from "@/lib/skill-api";

export const runtime = "nodejs";

function parseBody(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const description = typeof value.description === "string" ? value.description.trim() : "";
  const options = Array.isArray(value.options) ? value.options.filter((item): item is string => typeof item === "string") : [];
  const endsAt = typeof value.endsAt === "string" ? value.endsAt : null;
  return { title, description, options, endsAt };
}

export async function GET(request: Request) {
  return withSkillAuth(request, async (_request, { viewer }) => {
    const { searchParams } = new URL(request.url);
    const polls = await listPollsForViewer(viewer.id, parseLimit(searchParams.get("limit"), 20, 50));
    return skillJson({ polls });
  });
}

export async function POST(request: Request) {
  return withSkillAuth(request, async (_request, { viewer }) => {
    const body = parseBody(await request.json().catch(() => null));
    if (!body) {
      return skillJson({ error: "请求参数不正确" }, { status: 400 });
    }

    try {
      const id = await createPollForViewer(viewer, body);
      return skillJson({ id }, { status: 201 });
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_POLL_CONTENT") {
        return skillJson({ error: "投票标题和说明不能为空" }, { status: 400 });
      }
      if (error instanceof Error && error.message === "INVALID_POLL_OPTIONS") {
        return skillJson({ error: "至少需要 2 个有效选项" }, { status: 400 });
      }
      if (error instanceof Error && error.message === "INVALID_POLL_ENDS_AT") {
        return skillJson({ error: "截止时间必须晚于当前时间" }, { status: 400 });
      }
      return skillJson({ error: "创建投票失败" }, { status: 500 });
    }
  });
}
