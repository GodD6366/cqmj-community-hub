import type { CommunityComment, CommunityPost, PostCategory, PostDraft, PostStatus, VisibilityScope } from "./types";
import { prisma } from "./db";
import { ensureSeeded } from "./seed";
import type { Prisma } from "@/generated/prisma/client";

type PostRecord = Prisma.PostGetPayload<{
  include: {
    comments: true;
    favorites: { select: { userId: true } };
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
    pinned: post.pinned,
    featured: post.featured,
    favorited,
    reported,
  };
}

export async function listPostsForViewer(viewerId: string | null) {
  await ensureSeeded();
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
      reports: { select: { userId: true } },
    },
    orderBy: [{ pinned: "desc" }, { featured: "desc" }, { createdAt: "desc" }],
  });

  return posts.map((post) => mapPost(post, viewerId));
}

export async function getPostForViewer(postId: string, viewerId: string | null) {
  await ensureSeeded();
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      comments: { orderBy: { createdAt: "asc" } },
      favorites: { select: { userId: true } },
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
  await ensureSeeded();
  const post = await prisma.post.create({
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
    },
  });

  return post.id;
}

export async function addCommentForViewer(
  postId: string,
  viewer: { id: string; username: string },
  content: string,
) {
  await ensureSeeded();
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || !canViewPost(post, viewer.id)) {
    return null;
  }

  const comment = await prisma.comment.create({
    data: {
      postId,
      authorName: viewer.username,
      authorId: viewer.id,
      content,
    },
  });

  await prisma.post.update({
    where: { id: postId },
    data: {
      commentCount: { increment: 1 },
      updatedAt: comment.createdAt,
    },
  });

  return mapComment(comment);
}

export async function toggleFavoriteForViewer(postId: string, viewerId: string) {
  await ensureSeeded();
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

  await prisma.$transaction([
    prisma.favorite.create({
      data: {
        postId,
        userId: viewerId,
      },
    }),
    prisma.post.update({
      where: { id: postId },
      data: { favoriteCount: { increment: 1 } },
    }),
  ]);

  return { favorited: true };
}

export async function reportPostForViewer(postId: string, viewerId: string, reason?: string) {
  await ensureSeeded();
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
  await ensureSeeded();
  const posts = await prisma.post.findMany({
    include: {
      comments: { orderBy: { createdAt: "asc" } },
      favorites: { select: { userId: true } },
      reports: { select: { userId: true } },
    },
    orderBy: [{ pinned: "desc" }, { featured: "desc" }, { createdAt: "desc" }],
  });

  return posts.map((post) => mapPost(post, null));
}

export async function deletePostForAdmin(postId: string) {
  await ensureSeeded();

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
