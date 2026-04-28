import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import { deletePostForViewer, getPostForViewer, updatePostForViewer } from "@/lib/community-server";
import { validateImageStorageFields, validatePostImages } from "@/lib/post-images";
import { getPublicImageBaseUrl, getUploadPrefix } from "@/lib/s3-storage";
import { isPostCategory } from "@/lib/types";
import type { VisibilityScope } from "@/lib/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function parseDraft(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const content = typeof value.content === "string" ? value.content.trim() : "";
  const category = value.category;
  const tags = Array.isArray(value.tags) ? value.tags.filter((item): item is string => typeof item === "string") : [];
  const visibility = value.visibility;
  const anonymous = Boolean(value.anonymous);
  const images = Array.isArray(value.images) ? value.images : [];
  return { title, content, category, tags, visibility, anonymous, images };
}

function isVisibilityScope(value: unknown): value is VisibilityScope {
  return value === "community" || value === "building" || value === "private";
}

function validateDraft(draft: ReturnType<typeof parseDraft>) {
  if (!draft?.title || !draft.content || !draft.tags.length) {
    return { ok: false as const, response: NextResponse.json({ error: "标题、内容和标签不能为空" }, { status: 400 }) };
  }

  if (!isPostCategory(draft.category)) {
    return { ok: false as const, response: NextResponse.json({ error: "分类不合法" }, { status: 400 }) };
  }

  if (!isVisibilityScope(draft.visibility)) {
    return { ok: false as const, response: NextResponse.json({ error: "可见范围不合法" }, { status: 400 }) };
  }

  const imageValidation = validatePostImages(draft.images);
  if (!imageValidation.ok) {
    return { ok: false as const, response: NextResponse.json({ error: imageValidation.error }, { status: 400 }) };
  }

  if (imageValidation.images.length > 0) {
    let imageStorageValidation;
    try {
      imageStorageValidation = validateImageStorageFields(imageValidation.images, {
        publicBaseUrl: getPublicImageBaseUrl(),
        uploadPrefix: getUploadPrefix(),
      });
    } catch (error) {
      return {
        ok: false as const,
        response: NextResponse.json(
          { error: error instanceof Error ? error.message : "对象存储配置错误" },
          { status: 500 },
        ),
      };
    }

    if (!imageStorageValidation.ok) {
      return { ok: false as const, response: NextResponse.json({ error: imageStorageValidation.error }, { status: 400 }) };
    }
  }

  return {
    ok: true as const,
    draft: {
      title: draft.title,
      content: draft.content,
      category: draft.category,
      tags: draft.tags,
      visibility: draft.visibility,
      anonymous: draft.anonymous,
      images: imageValidation.images,
    },
  };
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

export async function PATCH(request: Request, { params }: RouteParams) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "请先登录再编辑" }, { status: 401 });
  }

  const validation = validateDraft(parseDraft(await request.json().catch(() => null)));
  if (!validation.ok) {
    return validation.response;
  }

  const { id } = await params;
  const result = await updatePostForViewer(id, currentUser, validation.draft);
  if (result.status === "not_found") {
    return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
  }
  if (result.status === "forbidden") {
    return NextResponse.json({ error: "只能编辑自己发布的帖子" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: RouteParams) {
  const currentUser = await getCurrentUserFromCookie();
  if (!currentUser) {
    return NextResponse.json({ error: "请先登录再删除" }, { status: 401 });
  }

  const { id } = await params;
  const result = await deletePostForViewer(id, currentUser);
  if (result.status === "not_found") {
    return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
  }
  if (result.status === "forbidden") {
    return NextResponse.json({ error: "只能删除自己发布的帖子" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
