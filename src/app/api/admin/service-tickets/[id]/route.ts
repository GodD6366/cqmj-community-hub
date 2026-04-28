import { NextResponse } from "next/server";
import { getCurrentUserFromCookie, isAdminUser } from "@/lib/auth-server";
import { updateServiceTicketStatusForAdmin } from "@/lib/resident-server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function parseBody(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const status = typeof value.status === "string" ? value.status : undefined;
  const assigneeNote = typeof value.assigneeNote === "string" ? value.assigneeNote.trim() : undefined;
  return { status, assigneeNote };
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
  const body = parseBody(await request.json().catch(() => null));
  if (!body || (body.status !== "open" && body.status !== "processing" && body.status !== "resolved")) {
    return NextResponse.json({ error: "工单状态不合法" }, { status: 400 });
  }

  try {
    const serviceTicket = await updateServiceTicketStatusForAdmin(id, body.status, body.assigneeNote);
    return NextResponse.json({ serviceTicket });
  } catch (error) {
    if (error instanceof Error && error.message === "TICKET_NOT_FOUND") {
      return NextResponse.json({ error: "工单不存在" }, { status: 404 });
    }
    return NextResponse.json({ error: "更新工单状态失败" }, { status: 500 });
  }
}
