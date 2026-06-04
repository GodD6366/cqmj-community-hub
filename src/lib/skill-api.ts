import { NextResponse } from "next/server";
import { verifyUserSkillToken } from "./skill-auth";
import { createPostForViewer, listPostsForViewer } from "./community-server";
import { validateImageStorageFields, validatePostImages } from "./post-images";
import { validateAttachmentStorageFields, validatePostAttachments } from "./post-attachments";
import { getPublicImageBaseUrl, getUploadPrefix } from "./s3-storage";
import { isPostCategory, isRequestStatus } from "./types";
import type { CommunityUser, PostCategory, VisibilityScope, RequestStatus } from "./types";

export interface SkillRouteContext {
  viewer: CommunityUser;
}

export type SkillRouteHandler<TArgs extends unknown[] = []> = (
  request: Request,
  context: SkillRouteContext,
  ...args: TArgs
) => Promise<Response> | Response;

export const skillNoStoreHeaders = {
  "Cache-Control": "no-store",
};

export function skillJson(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...skillNoStoreHeaders,
      ...(init?.headers ?? {}),
    },
  });
}

export function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token.trim();
}

export async function withSkillAuth<TArgs extends unknown[]>(
  request: Request,
  handler: SkillRouteHandler<TArgs>,
  ...args: TArgs
) {
  if (request.headers.get("origin")) {
    return skillJson({ error: "Browser-originated requests are not allowed." }, { status: 403 });
  }

  const token = readBearerToken(request);
  if (!token) {
    return skillJson({ error: "Missing bearer token." }, { status: 401 });
  }

  const viewer = await verifyUserSkillToken(token);
  if (!viewer) {
    return skillJson({ error: "Invalid or expired bearer token." }, { status: 401 });
  }

  return handler(request, { viewer }, ...args);
}

function parsePostDraft(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const content = typeof value.content === "string" ? value.content.trim() : "";
  const category = value.category;
  const tags = Array.isArray(value.tags) ? value.tags.filter((item): item is string => typeof item === "string") : [];
  const visibility = value.visibility;
  const anonymous = Boolean(value.anonymous);
  const images = Array.isArray(value.images) ? value.images : [];
  const attachments = Array.isArray(value.attachments) ? value.attachments : [];
  return { title, content, category, tags, visibility, anonymous, images, attachments };
}

function isVisibilityScope(value: unknown): value is VisibilityScope {
  return value === "community" || value === "building" || value === "private";
}

export function parseLimit(value: string | null, fallback: number, max: number) {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}

export function parsePostCategory(value: string | null): PostCategory | undefined {
  return isPostCategory(value) ? value : undefined;
}

export function parseRequestStatus(value: string | null): RequestStatus | undefined {
  return isRequestStatus(value) ? value : undefined;
}

export async function createSkillPostFromRequest(request: Request, viewer: CommunityUser) {
  const draft = parsePostDraft(await request.json().catch(() => null));
  if (!draft?.title || !draft.content || !draft.tags.length) {
    return skillJson({ error: "标题、内容和标签不能为空" }, { status: 400 });
  }

  if (!isPostCategory(draft.category)) {
    return skillJson({ error: "分类不合法" }, { status: 400 });
  }

  if (!isVisibilityScope(draft.visibility)) {
    return skillJson({ error: "可见范围不合法" }, { status: 400 });
  }

  const imageValidation = validatePostImages(draft.images);
  if (!imageValidation.ok) {
    return skillJson({ error: imageValidation.error }, { status: 400 });
  }

  if (imageValidation.images.length > 0) {
    let imageStorageValidation;
    try {
      imageStorageValidation = validateImageStorageFields(imageValidation.images, {
        publicBaseUrl: getPublicImageBaseUrl(),
        uploadPrefix: getUploadPrefix(),
      });
    } catch (error) {
      return skillJson(
        { error: error instanceof Error ? error.message : "对象存储配置错误" },
        { status: 500 },
      );
    }

    if (!imageStorageValidation.ok) {
      return skillJson({ error: imageStorageValidation.error }, { status: 400 });
    }
  }

  const attachmentValidation = validatePostAttachments(draft.attachments);
  if (!attachmentValidation.ok) {
    return skillJson({ error: attachmentValidation.error }, { status: 400 });
  }

  if (attachmentValidation.attachments.length > 0) {
    let attachmentStorageValidation;
    try {
      attachmentStorageValidation = validateAttachmentStorageFields(attachmentValidation.attachments, {
        publicBaseUrl: getPublicImageBaseUrl(),
        uploadPrefix: getUploadPrefix(),
      });
    } catch (error) {
      return skillJson(
        { error: error instanceof Error ? error.message : "对象存储配置错误" },
        { status: 500 },
      );
    }

    if (!attachmentStorageValidation.ok) {
      return skillJson({ error: attachmentStorageValidation.error }, { status: 400 });
    }
  }

  const id = await createPostForViewer(viewer, {
    title: draft.title,
    content: draft.content,
    category: draft.category,
    tags: draft.tags,
    visibility: draft.visibility,
    anonymous: draft.anonymous,
    images: imageValidation.images,
    attachments: attachmentValidation.attachments,
  });

  return skillJson({ id }, { status: 201 });
}

export async function listSkillPostsFromRequest(request: Request, viewer: CommunityUser) {
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter");
  const validFilters = ["all", "latest", "following", "featured"] as const;
  const filterParam = validFilters.includes(filter as (typeof validFilters)[number])
    ? (filter as "all" | "latest" | "following" | "featured")
    : undefined;
  const categoryParam = parsePostCategory(searchParams.get("category"));
  const requestStatusParam = parseRequestStatus(searchParams.get("requestStatus"));
  const limit = parseLimit(searchParams.get("limit"), 10, 50);

  const posts = await listPostsForViewer(viewer.id, {
    filter: filterParam,
    category: categoryParam,
    requestStatus: requestStatusParam,
  });

  return skillJson({ posts: posts.slice(0, limit) });
}
