import { NextResponse } from "next/server";
import { getCurrentAdminFromCookie } from "@/lib/admin-auth";
import { deleteInviteCode, updateInviteCode } from "@/lib/invite";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function parseBody(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const code = typeof value.code === "string" ? value.code.trim() : undefined;
  const note = typeof value.note === "string" ? value.note.trim() : undefined;
  const active = typeof value.active === "boolean" ? value.active : undefined;
  const maxUses = typeof value.maxUses === "number" && Number.isFinite(value.maxUses) ? value.maxUses : undefined;
  const expiresAt = typeof value.expiresAt === "string" && value.expiresAt ? new Date(value.expiresAt) : undefined;
  return { code, note, active, maxUses, expiresAt };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const admin = await getCurrentAdminFromCookie();
  if (!admin) {
    return NextResponse.json({ error: "请先登录管理员后台" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = parseBody(await request.json().catch(() => null));
  if (!parsed) {
    return NextResponse.json({ error: "请求参数不正确" }, { status: 400 });
  }

  try {
    const inviteCode = await updateInviteCode(id, parsed);
    return NextResponse.json({ inviteCode });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_INVITE_CODE") {
      return NextResponse.json({ error: "邀请码格式不正确" }, { status: 400 });
    }
    return NextResponse.json({ error: "更新邀请码失败" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: RouteParams) {
  const admin = await getCurrentAdminFromCookie();
  if (!admin) {
    return NextResponse.json({ error: "请先登录管理员后台" }, { status: 401 });
  }

  const { id } = await params;
  await deleteInviteCode(id);
  return NextResponse.json({ ok: true });
}
