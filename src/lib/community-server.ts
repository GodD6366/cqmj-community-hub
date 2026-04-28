import type { CommunityComment, CommunityPost, PostCategory, PostDraft, PostStatus, VisibilityScope } from "./types";
import { prisma } from "./db";
import type { Prisma } from "@/generated/prisma/client";
import { createNotificationRecord } from "./resident-server";
import { resolvePublicImageUrl } from "./s3-storage";

type PostRecord = Prisma.PostGetPayload<{
  include: {
    comments: true;
    favorites: { select: { userId: true } };
    images: { orderBy: { sortOrder: "asc" } };
    reports: { select: { userId: true } };
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

export function canViewPost(post: { status: PostStatus; visibility: VisibilityScope; authorId: string | null }, viewerId: string | null) {
  if (post.status === "published" && post.visibility !== "private") {
    return true;
  }
  if (!viewerId) {
    return false;
  }
  return post.authorId === viewerId;
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
  const posts = await prisma.post.findMany({
    where: viewerId
      ? {
          OR: [
            { status: "published", visibility: { not: "private" } },
            { authorId: viewerId },
          ],
        }
      : {
          status: "published",
          visibility: { not: "private" },
        },
    include: {
      comments: { orderBy: { createdAt: "asc" } },
      favorites: { select: { userId: true } },
      images: { orderBy: { sortOrder: "asc" } },
      reports: { select: { userId: true } },
    },
    orderBy: [{ pinned: "desc" }, { featured: "desc" }, { createdAt: "desc" }],
  });

  return posts.map((post) => mapPost(post, viewerId));
}

export async function getPostForViewer(postId: string, viewerId: string | null) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      comments: { orderBy: { createdAt: "asc" } },
      favorites: { select: { userId: true } },
      images: { orderBy: { sortOrder: "asc" } },
      reports: { select: { userId: true } },
    },
  });

  if (!post || !canViewPost(post, viewerId)) {
    return null;
  }

  return mapPost(post, viewerId);
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
  viewer: { id: string; username: string },
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
    },
  });
  if (!post || !canViewPost(post, viewer.id)) {
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

export async function toggleFavoriteForViewer(postId: string, viewerId: string) {
  const post = await prisma.post.findUnique({
    where: {
      id: postId,
    },
    select: {
      id: true,
      title: true,
      authorId: true,
    },
  });

  if (!post) {
    throw new Error("POST_NOT_FOUND");
  }

  const favorite = await prisma.favorite.findUnique({
    where: {
      postId_userId: {
        postId,
        userId: viewerId,
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
        userId: viewerId,
      },
    });
    await tx.post.update({
      where: { id: postId },
      data: { favoriteCount: { increment: 1 } },
    });

    if (post.authorId && post.authorId !== viewerId) {
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

export async function reportPostForViewer(postId: string, viewerId: string, reason?: string) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || !canViewPost(post, viewerId)) {
    return null;
  }

  await prisma.report.upsert({
    where: {
      postId_userId: {
        postId,
        userId: viewerId,
      },
    },
    create: {
      postId,
      userId: viewerId,
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
    },
    orderBy: [{ pinned: "desc" }, { featured: "desc" }, { createdAt: "desc" }],
  });

  return posts.map((post) => mapPost(post, null));
}

export async function deletePostForAdmin(postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true },
  });

  if (!post) {
    return false;
  }

  await prisma.post.delete({
    where: { id: postId },
  });

  return true;
}
