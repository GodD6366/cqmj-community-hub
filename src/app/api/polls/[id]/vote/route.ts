import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import { votePollForViewer } from "@/lib/resident-server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "请先登录后参与投票" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const optionId = typeof body?.optionId === "string" ? body.optionId : "";
  if (!optionId) {
    return NextResponse.json({ error: "请选择一个投票选项" }, { status: 400 });
  }

  try {
    await votePollForViewer(id, optionId, currentUser);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "POLL_NOT_FOUND") {
      return NextResponse.json({ error: "投票不存在" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "POLL_CLOSED") {
      return NextResponse.json({ error: "该投票已经结束" }, { status: 409 });
    }
    if (error instanceof Error && error.message === "POLL_ALREADY_VOTED") {
      return NextResponse.json({ error: "你已经参与过这个投票了" }, { status: 409 });
    }
    if (error instanceof Error && error.message === "POLL_OPTION_NOT_FOUND") {
      return NextResponse.json({ error: "投票选项不存在" }, { status: 404 });
    }
    return NextResponse.json({ error: "参与投票失败" }, { status: 500 });
  }
}
