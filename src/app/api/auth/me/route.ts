import { NextResponse } from "next/server";
import { getCurrentUserFromCookie, toCommunityUser, updateCurrentUserProfile } from "@/lib/auth-server";

function parseBody(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const username = typeof value.username === "string" ? value.username.trim() : "";
  const nickname = typeof value.nickname === "string" ? value.nickname.trim() : "";
  const roomNumber = typeof value.roomNumber === "string" ? value.roomNumber.trim() : "";
  return { username, nickname, roomNumber };
}

export async function GET() {
  const user = await getCurrentUserFromCookie();
  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const parsed = parseBody(await request.json().catch(() => null));
  if (!parsed?.username || !parsed.nickname || !parsed.roomNumber) {
    return NextResponse.json({ error: "请填写昵称、用户名和房号" }, { status: 400 });
  }

  try {
    const user = await updateCurrentUserProfile(currentUser.id, parsed);
    return NextResponse.json({ user: toCommunityUser(user) });
  } catch (error) {
    if (error instanceof Error && error.message === "USERNAME_EXISTS") {
      return NextResponse.json({ error: "这个用户名已经被占用了" }, { status: 409 });
    }
    if (error instanceof Error && error.message === "INVALID_USERNAME") {
      return NextResponse.json({ error: "用户名不合法" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_NICKNAME") {
      return NextResponse.json({ error: "昵称不合法" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_ROOM_NUMBER") {
      return NextResponse.json({ error: "房号格式不正确，请输入如 1-905" }, { status: 400 });
    }
    return NextResponse.json({ error: "更新资料失败" }, { status: 500 });
  }
}
