import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import { updateRequestStatusForViewer } from "@/lib/community-server";
import { isRequestStatus } from "@/lib/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function parseBody(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  return {
    requestStatus: value.requestStatus,
  };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "请先登录再更新需求状态" }, { status: 401 });
  }

  const parsed = parseBody(await request.json().catch(() => null));
  if (!isRequestStatus(parsed?.requestStatus)) {
    return NextResponse.json({ error: "需求状态不合法" }, { status: 400 });
  }

  const { id } = await params;
  const result = await updateRequestStatusForViewer(id, currentUser, parsed.requestStatus);
  if (result.status === "not_found") {
    return NextResponse.json({ error: "需求不存在" }, { status: 404 });
  }
  if (result.status === "forbidden") {
    return NextResponse.json({ error: "只能更新自己发布的需求状态" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
