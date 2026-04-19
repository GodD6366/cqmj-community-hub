import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import { rotateUserMcpToken } from "@/lib/mcp-auth";

export async function POST() {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const result = await rotateUserMcpToken(currentUser.id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "USER_DISABLED") {
      return NextResponse.json({ error: "该账号已被管理员禁用" }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "重置 MCP key 失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
