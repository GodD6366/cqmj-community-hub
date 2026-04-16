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
  const result = await toggleFavoriteForViewer(id, currentUser.id);
  return NextResponse.json(result);
}
