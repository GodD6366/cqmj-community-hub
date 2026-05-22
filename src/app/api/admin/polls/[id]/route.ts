import { NextResponse } from "next/server";
import { getCurrentUserFromCookie, isAdminUser } from "@/lib/auth-server";
import { deletePollForAdmin, updatePollForAdmin } from "@/lib/resident-server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function parseBody(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const title = typeof value.title === "string" ? value.title : undefined;
  const description = typeof value.description === "string" ? value.description : undefined;
  const endsAt = typeof value.endsAt === "string" ? value.endsAt : value.endsAt === null ? null : undefined;
  const status = typeof value.status === "string" ? value.status : undefined;
  return { title, description, endsAt, status };
}

function isPollStatus(value: unknown): value is "active" | "closed" {
  return value === "active" || value === "closed";
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  if (!isAdminUser(currentUser)) {
    return NextResponse.json({ error: "只有管理员可以执行该操作" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = parseBody(await request.json().catch(() => null));
  if (!parsed) {
    return NextResponse.json({ error: "请求参数不正确" }, { status: 400 });
  }
  if (parsed.status !== undefined && !isPollStatus(parsed.status)) {
    return NextResponse.json({ error: "投票状态不合法" }, { status: 400 });
  }

  try {
    const poll = await updatePollForAdmin(id, {
      title: parsed.title,
      description: parsed.description,
      endsAt: parsed.endsAt === undefined ? undefined : parsed.endsAt ? new Date(parsed.endsAt) : null,
      status: parsed.status,
    });
    return NextResponse.json({ poll });
  } catch (error) {
    if (error instanceof Error && error.message === "POLL_NOT_FOUND") {
      return NextResponse.json({ error: "投票不存在" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "INVALID_POLL_CONTENT") {
      return NextResponse.json({ error: "投票标题和说明不能为空" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_POLL_ENDS_AT") {
      return NextResponse.json({ error: "投票截止时间不合法" }, { status: 400 });
    }
    return NextResponse.json({ error: "更新投票失败" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: RouteParams) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  if (!isAdminUser(currentUser)) {
    return NextResponse.json({ error: "只有管理员可以执行该操作" }, { status: 403 });
  }

  const { id } = await params;
  const ok = await deletePollForAdmin(id);
  if (!ok) {
    return NextResponse.json({ error: "投票不存在" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
