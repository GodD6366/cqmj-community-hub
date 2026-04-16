import { NextResponse } from "next/server";
import { getCurrentAdminFromCookie } from "@/lib/admin-auth";
import { createInviteCode, listInviteCodes } from "@/lib/invite";

function parseBody(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const code = typeof value.code === "string" ? value.code.trim() : "";
  const note = typeof value.note === "string" ? value.note.trim() : "";
  const maxUses = typeof value.maxUses === "number" && Number.isFinite(value.maxUses) ? value.maxUses : null;
  const expiresAt = typeof value.expiresAt === "string" && value.expiresAt ? new Date(value.expiresAt) : null;
  return { code, note, maxUses, expiresAt };
}

export async function GET() {
  const admin = await getCurrentAdminFromCookie();
  if (!admin) {
    return NextResponse.json({ error: "请先登录管理员后台" }, { status: 401 });
  }

  const inviteCodes = await listInviteCodes();
  return NextResponse.json({ inviteCodes });
}

export async function POST(request: Request) {
  const admin = await getCurrentAdminFromCookie();
  if (!admin) {
    return NextResponse.json({ error: "请先登录管理员后台" }, { status: 401 });
  }

  const parsed = parseBody(await request.json().catch(() => null));
  if (!parsed?.code) {
    return NextResponse.json({ error: "请填写邀请码" }, { status: 400 });
  }

  try {
    const inviteCode = await createInviteCode(parsed);
    return NextResponse.json({ inviteCode }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_INVITE_CODE") {
      return NextResponse.json({ error: "邀请码格式不正确" }, { status: 400 });
    }
    return NextResponse.json({ error: "创建邀请码失败" }, { status: 500 });
  }
}
