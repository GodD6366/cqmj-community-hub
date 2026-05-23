import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import { deleteServiceTicketForViewer, updateServiceTicketForViewer } from "@/lib/resident-server";
import type { ServiceTicketCategory } from "@/lib/types";
import { serviceTicketCategoryMeta } from "@/lib/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function parseBody(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const description = typeof value.description === "string" ? value.description.trim() : "";
  const category = typeof value.category === "string" ? value.category : "";
  return { title, description, category };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "请先登录后编辑工单" }, { status: 401 });
  }

  const { id } = await params;
  const body = parseBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json({ error: "请求参数不正确" }, { status: 400 });
  }

  if (!(body.category in serviceTicketCategoryMeta)) {
    return NextResponse.json({ error: "工单分类不合法" }, { status: 400 });
  }

  try {
    const result = await updateServiceTicketForViewer(id, currentUser, {
      title: body.title,
      description: body.description,
      category: body.category as ServiceTicketCategory,
    });

    if (result.status === "not_found") {
      return NextResponse.json({ error: "工单不存在" }, { status: 404 });
    }

    if (result.status === "forbidden") {
      return NextResponse.json({ error: "你不能编辑这个工单" }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_TICKET_CONTENT") {
      return NextResponse.json({ error: "标题和说明不能为空" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_TICKET_CATEGORY") {
      return NextResponse.json({ error: "工单分类不合法" }, { status: 400 });
    }
    return NextResponse.json({ error: "更新工单失败" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: RouteParams) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "请先登录后删除工单" }, { status: 401 });
  }

  const { id } = await params;
  const result = await deleteServiceTicketForViewer(id, currentUser);

  if (result.status === "not_found") {
    return NextResponse.json({ error: "工单不存在" }, { status: 404 });
  }

  if (result.status === "forbidden") {
    return NextResponse.json({ error: "你不能删除这个工单" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
