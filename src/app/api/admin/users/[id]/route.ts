import { NextResponse } from "next/server";
import { deleteAdminUser, updateAdminUser } from "@/lib/admin-users";
import { getCurrentUserFromCookie, isAdminUser } from "@/lib/auth-server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function parseBody(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const username = typeof value.username === "string" ? value.username.trim() : undefined;
  const roomNumber = typeof value.roomNumber === "string" ? value.roomNumber.trim() : undefined;
  const disabled = typeof value.disabled === "boolean" ? value.disabled : undefined;
  return { username, roomNumber, disabled };
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
  if (id === currentUser.id && parsed.disabled === true) {
    return NextResponse.json({ error: "不能禁用当前管理员账号" }, { status: 400 });
  }

  try {
    const user = await updateAdminUser(id, parsed);
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "USERNAME_EXISTS") {
      return NextResponse.json({ error: "这个用户名已经被占用了" }, { status: 409 });
    }
    if (error instanceof Error && error.message === "INVALID_USERNAME") {
      return NextResponse.json({ error: "用户名不合法" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_ROOM_NUMBER") {
      return NextResponse.json({ error: "房号格式不正确，请输入如 1-905" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "ADMIN_USER_READ_ONLY") {
      return NextResponse.json({ error: "管理员账号不支持在这里编辑" }, { status: 403 });
    }
    return NextResponse.json({ error: "更新用户失败" }, { status: 500 });
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
  if (id === currentUser.id) {
    return NextResponse.json({ error: "不能删除当前管理员账号" }, { status: 400 });
  }

  try {
    const ok = await deleteAdminUser(id);
    if (!ok) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_USER_READ_ONLY") {
      return NextResponse.json({ error: "管理员账号不支持在这里删除" }, { status: 403 });
    }
    return NextResponse.json({ error: "删除用户失败" }, { status: 500 });
  }
}
