import { afterEach, describe, expect, it } from "vitest";
import { mapPost } from "../src/lib/community-server";

function createPostRecord() {
  const now = new Date("2026-04-29T00:00:00.000Z");

  return {
    id: "post-1",
    title: "闲置：餐椅转让",
    content: "九成新，可自提。",
    category: "secondhand",
    tags: JSON.stringify(["闲置"]),
    authorName: "alice",
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
