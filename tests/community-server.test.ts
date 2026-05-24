import { afterEach, describe, expect, it } from "vitest";
import { canViewPost, mapPost } from "../src/lib/community-server";
import type { RequestStatus } from "../src/lib/types";

interface MockPostRecord {
  id: string;
  title: string;
  content: string;
  category: "request" | "secondhand" | "discussion" | "play";
  requestStatus: RequestStatus | null;
  tags: string;
  authorId: string | null;
  authorName: string;
  author: { roomNumber: string | null } | null;
  createdAt: Date;
  updatedAt: Date;
  commentCount: number;
  favoriteCount: number;
  visibility: "community" | "building" | "private";
  status: "published" | "pending" | "rejected" | "deleted";
  comments: Array<{
    id: string;
    authorName: string;
    content: string;
    createdAt: Date;
    authorId: string | null;
    postId: string;
  }>;
  favorites: Array<{ userId: string }>;
  reports: Array<{ userId: string }>;
  pinned: boolean;
  featured: boolean;
  images: Array<{
    id: string;
    postId: string;
    objectKey: string;
    url: string;
    mimeType: string;
    width: number;
    height: number;
    sizeBytes: number;
    sortOrder: number;
    createdAt: Date;
  }>;
}

function createPostRecord(): MockPostRecord {
  const now = new Date("2026-04-29T00:00:00.000Z");

  return {
    id: "post-1",
    title: "闲置：餐椅转让",
    content: "九成新，可自提。",
    category: "secondhand",
    requestStatus: null,
    tags: JSON.stringify(["闲置"]),
    authorId: "user-1",
    authorName: "alice",
    author: null,
    createdAt: now,
    updatedAt: now,
    commentCount: 0,
    favoriteCount: 0,
    visibility: "community",
    status: "published",
    comments: [],
    favorites: [],
    reports: [],
    pinned: false,
    featured: false,
    images: [
      {
        id: "image-1",
        postId: "post-1",
        objectKey: "posts/user-1/2026/04/demo.webp",
        url: "http://10.0.0.66:9000/cqmj/posts/user-1/2026/04/demo.webp",
        mimeType: "image/webp",
        width: 1200,
        height: 900,
        sizeBytes: 240000,
        sortOrder: 0,
        createdAt: now,
      },
    ],
  };
}

describe("mapPost", () => {
  const originalPublicBaseUrl = process.env.S3_PUBLIC_BASE_URL;

  afterEach(() => {
    process.env.S3_PUBLIC_BASE_URL = originalPublicBaseUrl;
  });

  it("resolves post image URLs from the runtime public base URL", () => {
    process.env.S3_PUBLIC_BASE_URL = "https://cdn.example.com/assets/";

    const post = mapPost(createPostRecord(), null);

    expect(post.images[0]?.url).toBe("https://cdn.example.com/assets/posts/user-1/2026/04/demo.webp");
  });

  it("keeps the stored post image URL when no public base URL is configured", () => {
    delete process.env.S3_PUBLIC_BASE_URL;

    const post = mapPost(createPostRecord(), null);

    expect(post.images[0]?.url).toBe("http://10.0.0.66:9000/cqmj/posts/user-1/2026/04/demo.webp");
  });
});

describe("canViewPost", () => {
  it("allows building-visible posts only to the same building", () => {
    const buildingPost = {
      status: "published" as const,
      visibility: "building" as const,
      authorId: "user-2",
      author: { roomNumber: "1-1201" },
    };

    expect(canViewPost(buildingPost, { id: "user-1", roomNumber: "1-905", role: "user" })).toBe(true);
    expect(canViewPost(buildingPost, { id: "user-3", roomNumber: "2-905", role: "user" })).toBe(false);
    expect(canViewPost(buildingPost, null)).toBe(false);
  });

  it("allows private or non-published posts only to the owner or admin", () => {
    const privatePost = {
      status: "published" as const,
      visibility: "private" as const,
      authorId: "user-2",
      author: { roomNumber: "1-1201" },
    };
    const pendingPost = {
      status: "pending" as const,
      visibility: "community" as const,
      authorId: "user-2",
      author: { roomNumber: "1-1201" },
    };

    expect(canViewPost(privatePost, { id: "user-2", roomNumber: "1-1201", role: "user" })).toBe(true);
    expect(canViewPost(privatePost, { id: "user-1", roomNumber: "1-905", role: "user" })).toBe(false);
    expect(canViewPost(privatePost, { id: "admin-1", role: "admin" })).toBe(true);

    expect(canViewPost(pendingPost, { id: "user-2", roomNumber: "1-1201", role: "user" })).toBe(true);
    expect(canViewPost(pendingPost, { id: "user-1", roomNumber: "1-905", role: "user" })).toBe(false);
    expect(canViewPost(pendingPost, { id: "admin-1", role: "admin" })).toBe(true);
  });
});
