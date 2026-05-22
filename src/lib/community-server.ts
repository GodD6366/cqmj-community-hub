import type {
  AdminPostUpdateInput,
  CommunityComment,
  CommunityPost,
  PostCategory,
  PostDraft,
  PostStatus,
  VisibilityScope,
} from "./types";
import { prisma } from "./db";
import type { Prisma } from "@/generated/prisma/client";
import { createNotificationRecord } from "./resident-server";
import { resolvePublicImageUrl } from "./s3-storage";
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
    tags: parseTags(post.tags),
    authorName: post.authorName,
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

export async function listPostsForViewer(viewerId: string | null) {
  const viewer =
    viewerId
      ? await prisma.user.findUnique({
          where: { id: viewerId },
          select: { id: true, roomNumber: true, role: true },
        })
      : null;

  const posts = await prisma.post.findMany({
    where: viewer?.role === "admin"
      ? undefined
      : viewerId
      ? {
          OR: [
            { status: "published" },
            { authorId: viewerId },
          ],
        }
      : {
          status: "published",
        },
    include: {
      comments: { orderBy: { createdAt: "asc" } },
      favorites: { select: { userId: true } },
      images: { orderBy: { sortOrder: "asc" } },
      reports: { select: { userId: true } },
      author: { select: { roomNumber: true } },
    },
    orderBy: [{ pinned: "desc" }, { featured: "desc" }, { createdAt: "desc" }],
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

  if (!post || !canViewPost(post, viewer)) {
    return null;
  }

  return mapPost(post, viewer?.id ?? null);
}

export async function createPostForViewer(
  viewer: { id: string; username: string },
  draft: PostDraft,
) {
  return prisma.$transaction(async (tx) => {
    const post = await tx.post.create({
      data: {
        title: draft.title,
        content: draft.content,
        category: draft.category,
        tags: buildTags(draft.tags),
        authorName: draft.anonymous ? "匿名居民" : viewer.username,
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
}

export async function updatePostForViewer(
  postId: string,
  viewer: { id: string; username: string; role?: string },
  draft: PostDraft,
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
        tags: buildTags(draft.tags),
        authorName: draft.anonymous ? "匿名居民" : viewer.username,
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

  await prisma.post.delete({
    where: { id: postId },
  });

  return { status: "ok" as const };
}

export async function addCommentForViewer(
  postId: string,
  viewer: { id: string; username: string; roomNumber?: string | null; role?: string },
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
        authorName: viewer.username,
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
        body: `${viewer.username} 回复了你`,
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
    await tx.post.delete({
      where: { id: postId },
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
