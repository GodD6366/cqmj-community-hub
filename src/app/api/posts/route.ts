import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth-server";
import { createPostForViewer, listPostsForViewer } from "@/lib/community-server";
import {
  countUnreadNotificationsForViewer,
  listNotificationsForViewer,
  listPollsForViewer,
  listServiceTicketsForViewer,
} from "@/lib/resident-server";
import { listNeighborSkillsForViewer } from "@/lib/skill-server";
import { getPublicImageBaseUrl, getUploadPrefix } from "@/lib/s3-storage";
import { validateImageStorageFields, validatePostImages } from "@/lib/post-images";
import { validateAttachmentStorageFields, validatePostAttachments } from "@/lib/post-attachments";
import { isPostCategory } from "@/lib/types";
import type { CommunityUser, NotificationItem, PollSummary, ServiceTicketSummary, NeighborSkillSummary } from "@/lib/types";

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
  const attachments = Array.isArray(value.attachments) ? value.attachments : [];
  return { title, content, category, tags, visibility, anonymous, images, attachments };
}

function buildResidentFallbackPayload(currentUser: CommunityUser | null = null) {
  return {
    posts: [],
    polls: [] as PollSummary[],
    neighborSkills: [] as NeighborSkillSummary[],
    serviceTickets: [] as ServiceTicketSummary[],
    notifications: [] as NotificationItem[],
    unreadNotificationCount: 0,
    currentUser,
  };
}

export async function GET(request: Request) {
  let currentUser: CommunityUser | null = null;

  try {
    currentUser = await getCurrentUserFromCookie();
  } catch (error) {
    console.error(error);
    return NextResponse.json(buildResidentFallbackPayload());
  }

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter");
  const category = searchParams.get("category");

  // 如果有筛选参数，只返回筛选后的帖子
  if (filter || category) {
    try {
      const viewerId = currentUser?.id ?? null;
      const validFilters = ["all", "latest", "following", "featured"];
      const filterParam = validFilters.includes(filter ?? "") ? filter as "all" | "latest" | "following" | "featured" : undefined;
      const categoryParam = isPostCategory(category) ? category : undefined;

      const posts = await listPostsForViewer(viewerId, {
        filter: filterParam,
        category: categoryParam,
      });

      return NextResponse.json({ posts });
    } catch (error) {
      console.error(error);
      return NextResponse.json({ posts: [] });
    }
  }

  // 否则返回完整的数据（初始化时使用）
  try {
    const viewerId = currentUser?.id ?? null;
    const [posts, polls, serviceTickets, notifications, unreadNotificationCount, neighborSkills] = await Promise.all([
      listPostsForViewer(viewerId),
      listPollsForViewer(viewerId),
      listServiceTicketsForViewer(viewerId),
      currentUser ? listNotificationsForViewer(currentUser.id) : Promise.resolve([]),
      currentUser ? countUnreadNotificationsForViewer(currentUser.id) : Promise.resolve(0),
      listNeighborSkillsForViewer(viewerId),
    ]);

    return NextResponse.json({
      posts,
      polls,
      neighborSkills,
      serviceTickets,
      notifications,
      unreadNotificationCount,
      currentUser,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(buildResidentFallbackPayload(currentUser));
  }
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

  const imageValidation = validatePostImages(draft.images);
  if (!imageValidation.ok) {
    return NextResponse.json({ error: imageValidation.error }, { status: 400 });
  }

  if (imageValidation.images.length > 0) {
    let imageStorageValidation;
    try {
      imageStorageValidation = validateImageStorageFields(imageValidation.images, {
        publicBaseUrl: getPublicImageBaseUrl(),
        uploadPrefix: getUploadPrefix(),
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "对象存储配置错误" },
        { status: 500 },
      );
    }

    if (!imageStorageValidation.ok) {
      return NextResponse.json({ error: imageStorageValidation.error }, { status: 400 });
    }
  }

  const attachmentValidation = validatePostAttachments(draft.attachments);
  if (!attachmentValidation.ok) {
    return NextResponse.json({ error: attachmentValidation.error }, { status: 400 });
  }

  if (attachmentValidation.attachments.length > 0) {
    let attachmentStorageValidation;
    try {
      attachmentStorageValidation = validateAttachmentStorageFields(attachmentValidation.attachments, {
        publicBaseUrl: getPublicImageBaseUrl(),
        uploadPrefix: getUploadPrefix(),
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "对象存储配置错误" },
        { status: 500 },
      );
    }

    if (!attachmentStorageValidation.ok) {
      return NextResponse.json({ error: attachmentStorageValidation.error }, { status: 400 });
    }
  }

  const id = await createPostForViewer(currentUser, {
    title: draft.title,
    content: draft.content,
    category: draft.category,
    tags: draft.tags,
    visibility: draft.visibility,
    anonymous: draft.anonymous,
    images: imageValidation.images,
    attachments: attachmentValidation.attachments,
  });

  return NextResponse.json({ id }, { status: 201 });
}
