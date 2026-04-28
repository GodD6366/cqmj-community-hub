import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import { toggleFavoriteForViewer } from "@/lib/community-server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_: Request, { params }: RouteParams) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "请先登录后收藏" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const result = await toggleFavoriteForViewer(id, currentUser.id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "POST_NOT_FOUND") {
      return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
    }
    return NextResponse.json({ error: "收藏失败" }, { status: 500 });
  }
}
