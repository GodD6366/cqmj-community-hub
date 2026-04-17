import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import { createPostForViewer, listPostsForViewer } from "@/lib/community-server";
import { isPostCategory } from "@/lib/types";

function parseDraft(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const content = typeof value.content === "string" ? value.content.trim() : "";
  const category = value.category;
  const tags = Array.isArray(value.tags) ? value.tags.filter((item): item is string => typeof item === "string") : [];
  const visibility = value.visibility;
  const anonymous = Boolean(value.anonymous);
  return { title, content, category, tags, visibility, anonymous };
}

export async function GET() {
  const currentUser = await getCurrentUserFromCookie();
  const posts = await listPostsForViewer(currentUser?.id ?? null);
  return NextResponse.json({ posts, currentUser });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "请先登录再发布" }, { status: 401 });
  }

  const draft = parseDraft(await request.json().catch(() => null));
  if (!draft?.title || !draft.content || !draft.tags.length) {
    return NextResponse.json({ error: "标题、内容和标签不能为空" }, { status: 400 });
  }

  if (!isPostCategory(draft.category)) {
    return NextResponse.json({ error: "分类不合法" }, { status: 400 });
  }

  if (draft.visibility !== "community" && draft.visibility !== "building" && draft.visibility !== "private") {
    return NextResponse.json({ error: "可见范围不合法" }, { status: 400 });
  }

  const id = await createPostForViewer(currentUser, {
    title: draft.title,
    content: draft.content,
    category: draft.category,
    tags: draft.tags,
    visibility: draft.visibility,
    anonymous: draft.anonymous,
  });

  return NextResponse.json({ id }, { status: 201 });
}
