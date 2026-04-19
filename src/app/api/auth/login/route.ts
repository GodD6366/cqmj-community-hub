import { NextResponse } from "next/server";
import { createSession, getSessionCookieOptions, loginUser, toCommunityUser } from "@/lib/auth-server";

function parseBody(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const username = typeof value.username === "string" ? value.username.trim() : "";
  const password = typeof value.password === "string" ? value.password : "";
  return { username, password };
}

export async function POST(request: Request) {
  const parsed = parseBody(await request.json().catch(() => null));
  if (!parsed?.username || !parsed.password) {
    return NextResponse.json({ error: "请填写用户名和密码" }, { status: 400 });
  }

  try {
    const user = await loginUser(parsed);
    const session = await createSession(user.id);
    const response = NextResponse.json({ user: toCommunityUser(user) });
    response.cookies.set("community_hub_session", session.token, getSessionCookieOptions(session.expiresAt));
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
      return NextResponse.json({ error: "用户名或密码不正确" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "USER_DISABLED") {
      return NextResponse.json({ error: "该账号已被管理员禁用" }, { status: 403 });
    }
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}
