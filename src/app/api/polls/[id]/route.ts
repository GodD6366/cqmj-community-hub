import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import { deletePollForViewer, updatePollForViewer } from "@/lib/resident-server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function parseBody(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const description = typeof value.description === "string" ? value.description.trim() : "";
  const options = Array.isArray(value.options) ? value.options.filter((item): item is string => typeof item === "string") : [];
  const endsAt = typeof value.endsAt === "string" ? value.endsAt : value.endsAt === null ? null : undefined;
  const status = typeof value.status === "string" ? value.status : undefined;
  return { title, description, options, endsAt, status };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "请先登录后编辑投票" }, { status: 401 });
  }

  const body = parseBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json({ error: "请求参数不正确" }, { status: 400 });
  }

  const { id } = await params;

  try {
    const result = await updatePollForViewer(id, currentUser, {
      title: body.title,
      description: body.description,
      options: body.options,
      endsAt: body.endsAt,
      status: body.status === "active" || body.status === "closed" ? body.status : undefined,
    });

    if (result.status === "not_found") {
      return NextResponse.json({ error: "投票不存在" }, { status: 404 });
    }
    if (result.status === "forbidden") {
      return NextResponse.json({ error: "你不能编辑这个投票" }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_POLL_CONTENT") {
      return NextResponse.json({ error: "投票标题和说明不能为空" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_POLL_OPTIONS") {
      return NextResponse.json({ error: "至少需要 2 个有效选项" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_POLL_ENDS_AT") {
      return NextResponse.json({ error: "投票截止时间不合法" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_POLL_STATUS") {
      return NextResponse.json({ error: "投票状态不合法" }, { status: 400 });
    }
    return NextResponse.json({ error: "更新投票失败" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: RouteParams) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "请先登录后删除投票" }, { status: 401 });
  }

  const { id } = await params;
  const result = await deletePollForViewer(id, currentUser);

  if (result.status === "not_found") {
    return NextResponse.json({ error: "投票不存在" }, { status: 404 });
  }
  if (result.status === "forbidden") {
    return NextResponse.json({ error: "你不能删除这个投票" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
