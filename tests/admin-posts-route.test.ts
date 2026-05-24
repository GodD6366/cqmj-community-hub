import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserFromCookieMock = vi.hoisted(() => vi.fn());
const isAdminUserMock = vi.hoisted(() => vi.fn());
const updatePostForAdminMock = vi.hoisted(() => vi.fn());
const deletePostForAdminMock = vi.hoisted(() => vi.fn());

vi.mock("../src/lib/auth-server", () => ({
  getCurrentUserFromCookie: getCurrentUserFromCookieMock,
  isAdminUser: isAdminUserMock,
}));

vi.mock("../src/lib/community-server", () => ({
  updatePostForAdmin: updatePostForAdminMock,
  deletePostForAdmin: deletePostForAdminMock,
}));

const routeContext = { params: Promise.resolve({ id: "post-1" }) };

describe("/api/admin/posts/[id] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid post statuses", async () => {
    const { PATCH } = await import("../src/app/api/admin/posts/[id]/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce({ id: "admin-1", role: "admin" });
    isAdminUserMock.mockReturnValueOnce(true);

    const response = await PATCH(
      new Request("http://localhost/api/admin/posts/post-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "unknown" }),
      }),
      routeContext,
    );

    expect(response.status).toBe(400);
    expect(updatePostForAdminMock).not.toHaveBeenCalled();
  });

  it("updates moderation fields for admins", async () => {
    const { PATCH } = await import("../src/app/api/admin/posts/[id]/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce({ id: "admin-1", role: "admin" });
    isAdminUserMock.mockReturnValueOnce(true);
    updatePostForAdminMock.mockResolvedValueOnce({ id: "post-1", status: "published", pinned: true, featured: false });

    const response = await PATCH(
      new Request("http://localhost/api/admin/posts/post-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published", pinned: true, featured: false }),
      }),
      routeContext,
    );

    expect(response.status).toBe(200);
    expect(updatePostForAdminMock).toHaveBeenCalledWith("post-1", {
      status: "published",
      pinned: true,
      featured: false,
    });
  });

  it("deletes a post for admins (logical delete)", async () => {
    const { DELETE } = await import("../src/app/api/admin/posts/[id]/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce({ id: "admin-1", role: "admin" });
    isAdminUserMock.mockReturnValueOnce(true);
    deletePostForAdminMock.mockResolvedValueOnce(true);

    const response = await DELETE(new Request("http://localhost/api/admin/posts/post-1", { method: "DELETE" }), routeContext);

    expect(response.status).toBe(200);
    expect(deletePostForAdminMock).toHaveBeenCalledWith("post-1");
  });

  it("returns 404 when deleting non-existent post", async () => {
    const { DELETE } = await import("../src/app/api/admin/posts/[id]/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce({ id: "admin-1", role: "admin" });
    isAdminUserMock.mockReturnValueOnce(true);
    deletePostForAdminMock.mockResolvedValueOnce(false);

    const response = await DELETE(new Request("http://localhost/api/admin/posts/post-1", { method: "DELETE" }), routeContext);

    expect(response.status).toBe(404);
  });
});
