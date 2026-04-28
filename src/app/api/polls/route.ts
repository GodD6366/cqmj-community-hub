import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import { createPollForViewer, listPollsForViewer } from "@/lib/resident-server";

function parseBody(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const description = typeof value.description === "string" ? value.description.trim() : "";
  const options = Array.isArray(value.options) ? value.options.filter((item): item is string => typeof item === "string") : [];
  const endsAt = typeof value.endsAt === "string" ? value.endsAt : null;
  return { title, description, options, endsAt };
}

export async function GET() {
  const currentUser = await getCurrentUserFromCookie();
  const polls = await listPollsForViewer(currentUser?.id ?? null, 20);
  return NextResponse.json({ polls });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "请先登录后发起投票" }, { status: 401 });
  }

  const body = parseBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json({ error: "请求参数不正确" }, { status: 400 });
  }

  try {
    const id = await createPollForViewer(currentUser, body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_POLL_CONTENT") {
      return NextResponse.json({ error: "投票标题和说明不能为空" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_POLL_OPTIONS") {
      return NextResponse.json({ error: "至少需要 2 个有效选项" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_POLL_ENDS_AT") {
      return NextResponse.json({ error: "截止时间必须晚于当前时间" }, { status: 400 });
    }
    return NextResponse.json({ error: "创建投票失败" }, { status: 500 });
  }
}
