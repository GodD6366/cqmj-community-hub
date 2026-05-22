import { NextResponse } from "next/server";
import { getCurrentUserFromCookie, isAdminUser } from "@/lib/auth-server";
import { deletePostForAdmin, updatePostForAdmin } from "@/lib/community-server";
import type { PostStatus } from "@/lib/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function parseBody(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const status = typeof value.status === "string" ? value.status : undefined;
  const pinned = typeof value.pinned === "boolean" ? value.pinned : undefined;
  const featured = typeof value.featured === "boolean" ? value.featured : undefined;
  return { status, pinned, featured };
}

function isPostStatus(value: unknown): value is PostStatus {
  return value === "published" || value === "pending" || value === "rejected";
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
  if (parsed.status !== undefined && !isPostStatus(parsed.status)) {
    return NextResponse.json({ error: "帖子状态不合法" }, { status: 400 });
  }

  try {
    const post = await updatePostForAdmin(id, {
      status: isPostStatus(parsed.status) ? parsed.status : undefined,
      pinned: parsed.pinned,
      featured: parsed.featured,
    });
    return NextResponse.json({ post });
  } catch (error) {
    if (error instanceof Error && error.message === "POST_NOT_FOUND") {
      return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
    }
    return NextResponse.json({ error: "更新帖子失败" }, { status: 500 });
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
  const ok = await deletePostForAdmin(id);
  if (!ok) {
    return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
