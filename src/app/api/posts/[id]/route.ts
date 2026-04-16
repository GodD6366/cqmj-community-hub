import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import { getPostForViewer } from "@/lib/community-server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, { params }: RouteParams) {
  const { id } = await params;
  const currentUser = await getCurrentUserFromCookie();
  const post = await getPostForViewer(id, currentUser?.id ?? null);

  if (!post) {
    return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
  }

  return NextResponse.json({ post, currentUser });
}
