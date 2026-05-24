import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import { toggleFollow, isFollowing } from "@/lib/community-server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, { params }: RouteParams) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ following: false });
  }

  const { id: followingId } = await params;
  const following = await isFollowing(currentUser.id, followingId);

  return NextResponse.json({ following });
}

export async function POST(_: Request, { params }: RouteParams) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id: followingId } = await params;

  try {
    const result = await toggleFollow(currentUser.id, followingId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "CANNOT_FOLLOW_SELF") {
      return NextResponse.json({ error: "不能关注自己" }, { status: 400 });
    }
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
