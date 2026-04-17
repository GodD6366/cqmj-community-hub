import { NextResponse } from "next/server";
import { createSession, getSessionCookieOptions, registerUser, toCommunityUser } from "@/lib/auth-server";

function parseBody(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const username = typeof value.username === "string" ? value.username.trim() : "";
  const inviteCode = typeof value.inviteCode === "string" ? value.inviteCode.trim() : "";
  const roomNumber = typeof value.roomNumber === "string" ? value.roomNumber.trim() : "";
  const password = typeof value.password === "string" ? value.password : "";
  return { username, inviteCode, roomNumber, password };
}

export async function POST(request: Request) {
  const parsed = parseBody(await request.json().catch(() => null));
  if (!parsed?.username || !parsed.inviteCode || !parsed.roomNumber || parsed.password.length < 6) {
    return NextResponse.json({ error: "请填写用户名、邀请码、房号和不少于 6 位的密码" }, { status: 400 });
  }

  try {
    const user = await registerUser(parsed);
    const session = await createSession(user.id);
    const response = NextResponse.json({ user: toCommunityUser(user) });
    response.cookies.set("community_hub_session", session.token, getSessionCookieOptions(session.expiresAt));
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "USERNAME_EXISTS") {
      return NextResponse.json({ error: "这个用户名已经被占用了" }, { status: 409 });
    }
    if (error instanceof Error && error.message === "ROOM_NUMBER_EXISTS") {
      return NextResponse.json({ error: "这个房号已经绑定过了" }, { status: 409 });
    }
    if (error instanceof Error && error.message === "INVALID_INVITE_CODE") {
      return NextResponse.json({ error: "邀请码不正确" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "INVALID_ROOM_NUMBER") {
      return NextResponse.json({ error: "房号格式不正确，请输入如 1-905" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_PASSWORD") {
      return NextResponse.json({ error: "密码至少需要 6 位" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVITE_CODE_EXPIRED") {
      return NextResponse.json({ error: "邀请码已过期" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "INVITE_CODE_EXHAUSTED") {
      return NextResponse.json({ error: "邀请码已用完" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "INVALID_USERNAME") {
      return NextResponse.json({ error: "用户名不合法" }, { status: 400 });
    }
    return NextResponse.json({ error: "注册失败" }, { status: 500 });
  }
}
