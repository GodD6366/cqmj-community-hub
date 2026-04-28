import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserFromCookieMock = vi.hoisted(() => vi.fn());
const getPostForViewerMock = vi.hoisted(() => vi.fn());
const updatePostForViewerMock = vi.hoisted(() => vi.fn());
const deletePostForViewerMock = vi.hoisted(() => vi.fn());
const getPublicImageBaseUrlMock = vi.hoisted(() => vi.fn());
const getUploadPrefixMock = vi.hoisted(() => vi.fn());

vi.mock("../src/lib/auth-server", () => ({
  getCurrentUserFromCookie: getCurrentUserFromCookieMock,
}));

vi.mock("../src/lib/community-server", () => ({
  getPostForViewer: getPostForViewerMock,
  updatePostForViewer: updatePostForViewerMock,
  deletePostForViewer: deletePostForViewerMock,
}));

vi.mock("../src/lib/s3-storage", () => ({
  getPublicImageBaseUrl: getPublicImageBaseUrlMock,
  getUploadPrefix: getUploadPrefixMock,
}));

const routeContext = { params: Promise.resolve({ id: "post-1" }) };

const draft = {
  title: "更新后的标题",
  content: "更新后的内容",
  category: "discussion",
  tags: ["讨论"],
  visibility: "community",
  anonymous: false,
  images: [],
};

describe("/api/posts/[id] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPublicImageBaseUrlMock.mockReturnValue("https://cdn.example.com");
    getUploadPrefixMock.mockReturnValue("posts");
  });

  it("rejects unauthenticated edits", async () => {
    const { PATCH } = await import("../src/app/api/posts/[id]/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce(null);

    const response = await PATCH(
      new Request("http://localhost/api/posts/post-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      }),
      routeContext,
    );

    expect(response.status).toBe(401);
    expect(updatePostForViewerMock).not.toHaveBeenCalled();
  });

  it("updates a post when the server allows it", async () => {
    const { PATCH } = await import("../src/app/api/posts/[id]/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce({ id: "user-1", username: "alice", role: "user" });
    updatePostForViewerMock.mockResolvedValueOnce({ status: "ok" });

    const response = await PATCH(
      new Request("http://localhost/api/posts/post-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      }),
      routeContext,
    );

    expect(response.status).toBe(200);
    expect(updatePostForViewerMock).toHaveBeenCalledWith(
      "post-1",
      { id: "user-1", username: "alice", role: "user" },
      expect.objectContaining({ title: "更新后的标题", tags: ["讨论"] }),
    );
  });

  it("returns forbidden when editing another user's post", async () => {
    const { PATCH } = await import("../src/app/api/posts/[id]/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce({ id: "user-1", username: "alice", role: "user" });
    updatePostForViewerMock.mockResolvedValueOnce({ status: "forbidden" });

    const response = await PATCH(
      new Request("http://localhost/api/posts/post-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      }),
      routeContext,
    );

    expect(response.status).toBe(403);
  });

  it("deletes a post when the server allows it", async () => {
    const { DELETE } = await import("../src/app/api/posts/[id]/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce({ id: "user-1", username: "alice", role: "user" });
    deletePostForViewerMock.mockResolvedValueOnce({ status: "ok" });

    const response = await DELETE(new Request("http://localhost/api/posts/post-1", { method: "DELETE" }), routeContext);

    expect(response.status).toBe(200);
    expect(deletePostForViewerMock).toHaveBeenCalledWith("post-1", {
      id: "user-1",
      username: "alice",
      role: "user",
    });
  });
});
