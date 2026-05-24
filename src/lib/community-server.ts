import type {
  AdminPostUpdateInput,
  CommunityComment,
  CommunityPost,
  PostCategory,
  PostDraft,
  PostStatus,
  RequestStatus,
  VisibilityScope,
} from "./types";
import { prisma } from "./db";
import type { Prisma } from "@/generated/prisma/client";
import { createNotificationRecord } from "./resident-server";
import { resolvePublicImageUrl } from "./s3-storage";
import { triggerSkillMatching } from "./skill-server";
import { getBuildingFromRoomNumber } from "./access-control";

type PostRecord = Prisma.PostGetPayload<{
  include: {
    comments: true;
    favorites: { select: { userId: true } };
    images: { orderBy: { sortOrder: "asc" } };
    reports: { select: { userId: true } };
    author: { select: { roomNumber: true } };
  };
}>;

export const COMMUNITY_VIEWER_POPULATION = "viewer";

export function parseTags(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function buildTags(value: string[] | string) {
  return JSON.stringify(Array.isArray(value) ? value : parseTags(value));
}

type ViewerAccessContext =
  | {
      id: string;
      roomNumber?: string | null;
      role?: string;
    }
  | null;

function isSameBuilding(viewerRoomNumber: string | null | undefined, authorRoomNumber: string | null | undefined) {
  const viewerBuilding = getBuildingFromRoomNumber(viewerRoomNumber);
  const authorBuilding = getBuildingFromRoomNumber(authorRoomNumber);
  return Boolean(viewerBuilding && authorBuilding && viewerBuilding === authorBuilding);
}

export function canViewPost(
  post: {
    status: PostStatus;
    visibility: VisibilityScope;
    authorId: string | null;
    author?: { roomNumber: string | null } | null;
  },
  viewer: ViewerAccessContext,
) {
  if (viewer?.role === "admin") {
    return true;
  }

  const isOwner = Boolean(viewer?.id && post.authorId === viewer.id);
  if (post.status !== "published") {
    return isOwner;
  }

  if (post.visibility === "community") {
    return true;
  }

  if (post.visibility === "building") {
    if (isOwner) {
      return true;
    }
    return isSameBuilding(viewer?.roomNumber ?? null, post.author?.roomNumber ?? null);
  }

  return isOwner;
}

function canManagePost(
  post: { authorId: string | null },
  viewer: { id: string; role?: string },
) {
  return post.authorId === viewer.id || viewer.role === "admin";
}

function mapComment(comment: { id: string; authorName: string; content: string; createdAt: Date }): CommunityComment {
  return {
    id: comment.id,
    authorName: comment.authorName,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
  };
}

export function mapPost(post: PostRecord, viewerId: string | null): CommunityPost {
  const favorited = viewerId ? post.favorites.some((favorite) => favorite.userId === viewerId) : false;
  const reported = viewerId ? post.reports.some((report) => report.userId === viewerId) : false;

  return {
    id: post.id,
    title: post.title,
    content: post.content,
    category: post.category as PostCategory,
    requestStatus: (post.requestStatus as RequestStatus | null | undefined) ?? null,
    tags: parseTags(post.tags),
    authorName: post.authorName,
    authorId: post.authorId,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    commentCount: post.commentCount,
    favoriteCount: post.favoriteCount,
    visibility: post.visibility as VisibilityScope,
    status: post.status as PostStatus,
    comments: post.comments.map(mapComment),
    images: post.images.map((image) => ({
      id: image.id,
      objectKey: image.objectKey,
      url: resolvePublicImageUrl(image.objectKey, image.url),
      mimeType: image.mimeType,
      width: image.width,
      height: image.height,
      sizeBytes: image.sizeBytes,
      sortOrder: image.sortOrder,
    })),
    pinned: post.pinned,
    featured: post.featured,
    favorited,
    reported,
    isMine: viewerId ? post.authorId === viewerId : false,
  };
}

export async function listPostsForViewer(
  viewerId: string | null,
  options?: {
    filter?: "all" | "latest" | "following" | "featured";
    category?: PostCategory;
  },
) {
  if (options?.filter === "following" && !viewerId) {
    return [];
  }

  const viewer =
    viewerId
      ? await prisma.user.findUnique({
          where: { id: viewerId },
          select: { id: true, roomNumber: true, role: true },
        })
      : null;

  // 基础查询条件
  const baseWhere: Prisma.PostWhereInput = viewer?.role === "admin"
    ? { status: { not: "deleted" } }
    : viewerId
    ? {
        AND: [
          { status: { not: "deleted" } },
          {
            OR: [
              { status: "published" },
              { authorId: viewerId },
            ],
          },
        ],
      }
    : {
        status: "published",
      };

  // 分类筛选
  if (options?.category) {
    baseWhere.category = options.category;
  }

  // 特殊筛选
  if (options?.filter === "featured") {
    baseWhere.OR = [
      { pinned: true },
      { featured: true },
    ];
  } else if (options?.filter === "following" && viewerId) {
    // 查询关注用户的帖子
    const followingIds = await prisma.follow.findMany({
      where: { followerId: viewerId },
      select: { followingId: true },
    });
    const authorIds = followingIds.map((f) => f.followingId);
    authorIds.push(viewerId); // 包含自己的帖子
    baseWhere.authorId = { in: authorIds };
  }

  // 排序
  let orderBy: Prisma.PostOrderByWithRelationInput[];
  if (options?.filter === "latest") {
    orderBy = [{ createdAt: "desc" }];
  } else {
    orderBy = [{ pinned: "desc" }, { featured: "desc" }, { createdAt: "desc" }];
  }

  const posts = await prisma.post.findMany({
    where: baseWhere,
    include: {
      comments: { orderBy: { createdAt: "asc" } },
      favorites: { select: { userId: true } },
      images: { orderBy: { sortOrder: "asc" } },
      reports: { select: { userId: true } },
      author: { select: { roomNumber: true } },
    },
    orderBy,
  });

  return posts.filter((post) => canViewPost(post, viewer)).map((post) => mapPost(post, viewerId));
}

export async function getPostForViewer(
  postId: string,
  viewer:
    | {
        id: string;
        roomNumber?: string | null;
        role?: string;
      }
    | null,
) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      comments: { orderBy: { createdAt: "asc" } },
      favorites: { select: { userId: true } },
      images: { orderBy: { sortOrder: "asc" } },
      reports: { select: { userId: true } },
      author: { select: { roomNumber: true } },
    },
  });

  // 帖子不存在或已删除，返回 null
  if (!post || post.status === "deleted" || !canViewPost(post, viewer)) {
    return null;
  }

  const mapped = mapPost(post, viewer?.id ?? null);

  if (post.category === "request") {
    const matches = await prisma.postSkillMatch.findMany({
      where: { postId: post.id },
      include: {
        skill: {
          include: {
            user: { select: { name: true, roomNumber: true } }
          }
        }
      },
      orderBy: { score: "desc" },
      take: 5
    });

    mapped.skillMatches = matches.map(m => ({
      id: m.id,
      postId: m.postId,
      skillId: m.skillId,
      userId: m.skill.userId,
      ownerName: m.skill.user.name,
      roomNumber: m.skill.user.roomNumber ?? "未知",
      building: m.skill.user.roomNumber ? m.skill.user.roomNumber.split("-")[0] : "未知",
      category: m.skill.category as any,
      skillTitle: m.skill.title,
      skillDescription: m.skill.description,
      tags: JSON.parse(m.skill.tags || "[]"),
      availability: m.skill.availability,
      score: m.score / 100,
      reasons: JSON.parse(m.reasons || "[]"),
      source: m.source as "llm" | "rule",
      notifiedAt: m.notifiedAt ? m.notifiedAt.toISOString() : null,
    }));
  }

  return mapped;
}

export async function createPostForViewer(
  viewer: { id: string; nickname: string },
  draft: PostDraft,
) {
  const id = await prisma.$transaction(async (tx) => {
    const post = await tx.post.create({
      data: {
        title: draft.title,
        content: draft.content,
        category: draft.category,
        requestStatus: draft.category === "request" ? "open" : null,
        tags: buildTags(draft.tags),
        authorName: draft.anonymous ? "匿名居民" : viewer.nickname,
        authorId: viewer.id,
        visibility: draft.visibility,
        status: "published",
        pinned: false,
        featured: draft.category === "discussion",
        images: {
          create: draft.images.map((image) => ({
            objectKey: image.objectKey,
            url: image.url,
            mimeType: image.mimeType,
            width: image.width,
            height: image.height,
            sizeBytes: image.sizeBytes,
            sortOrder: image.sortOrder,
          })),
        },
      },
      select: {
        id: true,
        title: true,
      },
    });

    await createNotificationRecord(tx, {
      userId: viewer.id,
      type: "system",
      title: "你的内容已成功发布",
      body: post.title,
      href: `/posts/${post.id}`,
    });

    return post.id;
  });

  if (draft.category === "request") {
    // 异步触发，不阻塞返回
    triggerSkillMatching(id, draft.content).catch(console.error);
  }

  return id;
}

export async function updatePostForViewer(
  postId: string,
  viewer: { id: string; nickname: string; role?: string },
  draft: PostDraft,
) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, category: true, requestStatus: true },
  });

  if (!post) {
    return { status: "not_found" as const };
  }
  if (!canManagePost(post, viewer)) {
    return { status: "forbidden" as const };
  }

  await prisma.$transaction(async (tx) => {
    await tx.postImage.deleteMany({
      where: { postId },
    });

    await tx.post.update({
      where: { id: postId },
      data: {
        title: draft.title,
        content: draft.content,
        category: draft.category,
        requestStatus:
          draft.category === "request"
            ? post.category === "request" && post.requestStatus
              ? post.requestStatus
              : "open"
            : null,
        tags: buildTags(draft.tags),
        authorName: draft.anonymous ? "匿名居民" : viewer.nickname,
        visibility: draft.visibility,
        images: {
          create: draft.images.map((image) => ({
            objectKey: image.objectKey,
            url: image.url,
            mimeType: image.mimeType,
            width: image.width,
            height: image.height,
            sizeBytes: image.sizeBytes,
            sortOrder: image.sortOrder,
          })),
        },
      },
    });
  });

  if (draft.category === "request") {
    triggerSkillMatching(postId, draft.content).catch(console.error);
  }

  return { status: "ok" as const };
}

export async function updateRequestStatusForViewer(
  postId: string,
  viewer: { id: string; role?: string; nickname?: string },
  requestStatus: RequestStatus,
) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      title: true,
      authorId: true,
      category: true,
      requestStatus: true,
    },
  });

  if (!post || post.category !== "request") {
    return { status: "not_found" as const };
  }

  if (!canManagePost(post, viewer)) {
    return { status: "forbidden" as const };
  }

  await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: { id: postId },
      data: {
        requestStatus,
      },
    });

    if (post.authorId) {
      await createNotificationRecord(tx, {
        userId: post.authorId,
        type: "system",
        title: `你的需求「${post.title}」状态已更新`,
        body:
          requestStatus === "open"
            ? "当前状态：待处理"
            : requestStatus === "processing"
            ? "当前状态：处理中"
            : "当前状态：已解决",
        href: `/posts/${postId}`,
      });
    }
  });

  return { status: "ok" as const };
}

export async function deletePostForViewer(
  postId: string,
  viewer: { id: string; role?: string },
) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true },
  });

  if (!post) {
    return { status: "not_found" as const };
  }
  if (!canManagePost(post, viewer)) {
    return { status: "forbidden" as const };
  }

  // 逻辑删除：更新状态为 deleted
  await prisma.post.update({
    where: { id: postId },
    data: { status: "deleted" },
  });

  return { status: "ok" as const };
}

export async function addCommentForViewer(
  postId: string,
  viewer: { id: string; nickname: string; roomNumber?: string | null; role?: string },
  content: string,
) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      title: true,
      authorId: true,
      status: true,
      visibility: true,
      authorName: true,
      author: {
        select: {
          roomNumber: true,
        },
      },
    },
  });
  if (!post || !canViewPost(post, viewer)) {
    return null;
  }

  const created = await prisma.$transaction(async (tx) => {
    const comment = await tx.comment.create({
      data: {
        postId,
        authorName: viewer.nickname,
        authorId: viewer.id,
        content,
      },
    });

    await tx.post.update({
      where: { id: postId },
      data: {
        commentCount: { increment: 1 },
        updatedAt: comment.createdAt,
      },
    });

    if (post.authorId && post.authorId !== viewer.id) {
      await createNotificationRecord(tx, {
        userId: post.authorId,
        type: "comment",
        title: `你的帖子「${post.title}」有了新评论`,
        body: `${viewer.nickname} 回复了你`,
        href: `/posts/${post.id}`,
      });
    }

    return comment;
  });

  return mapComment(created);
}

export async function toggleFavoriteForViewer(
  postId: string,
  viewer: { id: string; roomNumber?: string | null; role?: string },
) {
  const post = await prisma.post.findUnique({
    where: {
      id: postId,
    },
    select: {
      id: true,
      title: true,
      authorId: true,
      status: true,
      visibility: true,
      author: {
        select: {
          roomNumber: true,
        },
      },
    },
  });

  if (!post) {
    throw new Error("POST_NOT_FOUND");
  }
  if (!canViewPost(post, viewer)) {
    throw new Error("POST_NOT_FOUND");
  }

  const favorite = await prisma.favorite.findUnique({
    where: {
      postId_userId: {
        postId,
        userId: viewer.id,
      },
    },
  });

  if (favorite) {
    await prisma.$transaction([
      prisma.favorite.delete({ where: { id: favorite.id } }),
      prisma.post.update({
        where: { id: postId },
        data: { favoriteCount: { decrement: 1 } },
      }),
    ]);
    return { favorited: false };
  }

  await prisma.$transaction(async (tx) => {
    await tx.favorite.create({
      data: {
        postId,
        userId: viewer.id,
      },
    });
    await tx.post.update({
      where: { id: postId },
      data: { favoriteCount: { increment: 1 } },
    });

    if (post.authorId && post.authorId !== viewer.id) {
      await createNotificationRecord(tx, {
        userId: post.authorId,
        type: "favorite",
        title: `你的帖子「${post.title}」被收藏了`,
        body: "有邻居把它加入了收藏列表",
        href: `/posts/${post.id}`,
      });
    }
  });

  return { favorited: true };
}

export async function reportPostForViewer(
  postId: string,
  viewer: { id: string; roomNumber?: string | null; role?: string },
  reason?: string,
) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: {
        select: {
          roomNumber: true,
        },
      },
    },
  });
  if (!post || !canViewPost(post, viewer)) {
    return null;
  }

  await prisma.report.upsert({
    where: {
      postId_userId: {
        postId,
        userId: viewer.id,
      },
    },
    create: {
      postId,
      userId: viewer.id,
      reason: reason ?? "用户举报",
    },
    update: {
      reason: reason ?? "用户举报",
    },
  });

  return true;
}

export async function listPostsForAdmin() {
  const posts = await prisma.post.findMany({
    where: { status: { not: "deleted" } },
    include: {
      comments: { orderBy: { createdAt: "asc" } },
      favorites: { select: { userId: true } },
      images: { orderBy: { sortOrder: "asc" } },
      reports: { select: { userId: true } },
      author: { select: { roomNumber: true } },
    },
    orderBy: [{ pinned: "desc" }, { featured: "desc" }, { createdAt: "desc" }],
  });

  return posts.map((post) => mapPost(post, null));
}

export async function updatePostForAdmin(postId: string, input: AdminPostUpdateInput) {
  const current = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      title: true,
      authorId: true,
      status: true,
      pinned: true,
      featured: true,
    },
  });

  if (!current) {
    throw new Error("POST_NOT_FOUND");
  }

  const data: Prisma.PostUpdateInput = {};
  if (input.status !== undefined) data.status = input.status;
  if (input.pinned !== undefined) data.pinned = input.pinned;
  if (input.featured !== undefined) data.featured = input.featured;

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.post.update({
      where: { id: postId },
      data,
      include: {
        comments: { orderBy: { createdAt: "asc" } },
        favorites: { select: { userId: true } },
        images: { orderBy: { sortOrder: "asc" } },
        reports: { select: { userId: true } },
        author: { select: { roomNumber: true } },
      },
    });

    if (current.authorId) {
      const details: string[] = [];
      if (input.status !== undefined && input.status !== current.status) {
        details.push(
          input.status === "published"
            ? "内容已发布"
            : input.status === "pending"
              ? "内容已转为待审核"
              : "内容已被驳回",
        );
      }
      if (input.pinned !== undefined && input.pinned !== current.pinned) {
        details.push(input.pinned ? "内容已置顶" : "内容已取消置顶");
      }
      if (input.featured !== undefined && input.featured !== current.featured) {
        details.push(input.featured ? "内容已加入精选" : "内容已取消精选");
      }

      if (details.length > 0) {
        await createNotificationRecord(tx, {
          userId: current.authorId,
          type: "system",
          title: `你的帖子「${next.title}」已由管理员处理`,
          body: details.join("；"),
          href: `/posts/${next.id}`,
        });
      }
    }

    return next;
  });

  return mapPost(updated, null);
}

export async function deletePostForAdmin(postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, title: true, authorId: true },
  });

  if (!post) {
    return false;
  }

  await prisma.$transaction(async (tx) => {
    // 逻辑删除：更新状态为 deleted
    await tx.post.update({
      where: { id: postId },
      data: { status: "deleted" },
    });

    if (post.authorId) {
      await createNotificationRecord(tx, {
        userId: post.authorId,
        type: "system",
        title: `你的帖子「${post.title}」已被管理员删除`,
        body: "该内容已从社区中移除。",
        href: "/neighbors",
      });
    }
  });

  return true;
}

// ==================== 关注功能 ====================

export async function toggleFollow(followerId: string, followingId: string) {
  if (followerId === followingId) {
    throw new Error("CANNOT_FOLLOW_SELF");
  }

  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId,
        followingId,
      },
    },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return { following: false };
  }

  await prisma.follow.create({
    data: {
      followerId,
      followingId,
    },
  });

  return { following: true };
}

export async function isFollowing(followerId: string, followingId: string) {
  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId,
        followingId,
      },
    },
  });

  return Boolean(existing);
}

export async function getFollowersCount(userId: string) {
  return prisma.follow.count({
    where: { followingId: userId },
  });
}

export async function getFollowingCount(userId: string) {
  return prisma.follow.count({
    where: { followerId: userId },
  });
}
