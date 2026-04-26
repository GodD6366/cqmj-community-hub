import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserFromCookieMock = vi.hoisted(() => vi.fn());
const listPostsForViewerMock = vi.hoisted(() => vi.fn());
const createPostForViewerMock = vi.hoisted(() => vi.fn());
const getPublicImageBaseUrlMock = vi.hoisted(() => vi.fn());
const getUploadPrefixMock = vi.hoisted(() => vi.fn());

vi.mock("../src/lib/auth-server", () => ({
  getCurrentUserFromCookie: getCurrentUserFromCookieMock,
}));

vi.mock("../src/lib/community-server", () => ({
  listPostsForViewer: listPostsForViewerMock,
  createPostForViewer: createPostForViewerMock,
}));

vi.mock("../src/lib/s3-storage", () => ({
  getPublicImageBaseUrl: getPublicImageBaseUrlMock,
  getUploadPrefix: getUploadPrefixMock,
}));

describe("/api/posts route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPublicImageBaseUrlMock.mockReturnValue("https://cdn.example.com");
    getUploadPrefixMock.mockReturnValue("posts");
  });

  it("rejects unauthenticated post creation", async () => {
    const { POST } = await import("../src/app/api/posts/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce(null);

    const response = await POST(
      new Request("http://localhost/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "闲置", content: "内容", category: "secondhand", tags: ["闲置"], visibility: "community", anonymous: false, images: [] }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("creates a post with validated image metadata", async () => {
    const { POST } = await import("../src/app/api/posts/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce({ id: "user-1", username: "alice" });
    createPostForViewerMock.mockResolvedValueOnce("post-123");

    const response = await POST(
      new Request("http://localhost/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "闲置：餐椅转让",
          content: "九成新，可自提。",
          category: "secondhand",
          tags: ["闲置", "餐椅"],
          visibility: "community",
          anonymous: false,
          images: [
            {
              objectKey: "posts/user-1/2026/04/demo-1.webp",
              url: "https://cdn.example.com/posts/user-1/2026/04/demo-1.webp",
              mimeType: "image/webp",
              width: 1200,
              height: 900,
              sizeBytes: 240000,
              sortOrder: 0,
            },
          ],
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(createPostForViewerMock).toHaveBeenCalledWith(
      { id: "user-1", username: "alice" },
      expect.objectContaining({
        title: "闲置：餐椅转让",
        images: [
          expect.objectContaining({
            objectKey: "posts/user-1/2026/04/demo-1.webp",
            url: "https://cdn.example.com/posts/user-1/2026/04/demo-1.webp",
            sortOrder: 0,
          }),
        ],
      }),
    );
  });

  it("rejects images from an invalid asset domain", async () => {
    const { POST } = await import("../src/app/api/posts/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce({ id: "user-1", username: "alice" });

    const response = await POST(
      new Request("http://localhost/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "闲置：餐椅转让",
          content: "九成新，可自提。",
          category: "secondhand",
          tags: ["闲置"],
          visibility: "community",
          anonymous: false,
          images: [
            {
              objectKey: "posts/user-1/2026/04/demo-1.webp",
              url: "https://evil.example.com/posts/user-1/2026/04/demo-1.webp",
              mimeType: "image/webp",
              width: 1200,
              height: 900,
              sizeBytes: 240000,
              sortOrder: 0,
            },
          ],
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "图片地址不在允许的资源域名下",
    });
  });
});
