import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import { createServiceTicketForViewer, listServiceTicketsForViewer } from "@/lib/resident-server";
import type { ServiceTicketCategory } from "@/lib/types";
import { serviceTicketCategoryMeta } from "@/lib/types";

function parseBody(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const description = typeof value.description === "string" ? value.description.trim() : "";
  const category = typeof value.category === "string" ? value.category : "";
  return { title, description, category };
}

export async function GET() {
  const currentUser = await getCurrentUserFromCookie();
  const serviceTickets = await listServiceTicketsForViewer(currentUser?.id ?? null, 24);
  return NextResponse.json({ serviceTickets });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "请先登录后提交工单" }, { status: 401 });
  }

  const body = parseBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json({ error: "请求参数不正确" }, { status: 400 });
  }

  try {
    if (!(body.category in serviceTicketCategoryMeta)) {
      return NextResponse.json({ error: "工单分类不合法" }, { status: 400 });
    }

    const id = await createServiceTicketForViewer(currentUser, {
      ...body,
      category: body.category as ServiceTicketCategory,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_TICKET_CONTENT") {
      return NextResponse.json({ error: "标题和说明不能为空" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_TICKET_CATEGORY") {
      return NextResponse.json({ error: "工单分类不合法" }, { status: 400 });
    }
    return NextResponse.json({ error: "提交工单失败" }, { status: 500 });
  }
}
