import { NextResponse } from "next/server";
import { createAdminSessionToken, getAdminCookieOptions, verifyAdminPassword } from "@/lib/admin-auth";

function parseBody(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const password = typeof value.password === "string" ? value.password : "";
  return { password };
}

export async function POST(request: Request) {
  const parsed = parseBody(await request.json().catch(() => null));
  if (!parsed?.password) {
    return NextResponse.json({ error: "请填写管理员密码" }, { status: 400 });
  }

  if (!verifyAdminPassword(parsed.password)) {
    return NextResponse.json({ error: "管理员密码不正确" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("community_hub_admin_session", createAdminSessionToken(), getAdminCookieOptions());
  return response;
}
