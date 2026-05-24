import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserFromCookieMock = vi.hoisted(() => vi.fn());
const updateRequestStatusForViewerMock = vi.hoisted(() => vi.fn());

vi.mock("../src/lib/auth-server", () => ({
  getCurrentUserFromCookie: getCurrentUserFromCookieMock,
}));

vi.mock("../src/lib/community-server", () => ({
  updateRequestStatusForViewer: updateRequestStatusForViewerMock,
}));

const routeContext = { params: Promise.resolve({ id: "post-1" }) };

describe("/api/posts/[id]/request-status route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated updates", async () => {
    const { PATCH } = await import("../src/app/api/posts/[id]/request-status/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce(null);

    const response = await PATCH(
      new Request("http://localhost/api/posts/post-1/request-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestStatus: "processing" }),
      }),
      routeContext,
    );

    expect(response.status).toBe(401);
    expect(updateRequestStatusForViewerMock).not.toHaveBeenCalled();
  });

  it("rejects invalid request status", async () => {
    const { PATCH } = await import("../src/app/api/posts/[id]/request-status/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce({ id: "user-1", username: "alice", role: "user" });

    const response = await PATCH(
      new Request("http://localhost/api/posts/post-1/request-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestStatus: "done" }),
      }),
      routeContext,
    );

    expect(response.status).toBe(400);
  });

  it("updates request status when allowed", async () => {
    const { PATCH } = await import("../src/app/api/posts/[id]/request-status/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce({ id: "user-1", username: "alice", role: "user" });
    updateRequestStatusForViewerMock.mockResolvedValueOnce({ status: "ok" });

    const response = await PATCH(
      new Request("http://localhost/api/posts/post-1/request-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestStatus: "resolved" }),
      }),
      routeContext,
    );

    expect(response.status).toBe(200);
    expect(updateRequestStatusForViewerMock).toHaveBeenCalledWith(
      "post-1",
      { id: "user-1", username: "alice", role: "user" },
      "resolved",
    );
  });

  it("returns forbidden when updating another user's request", async () => {
    const { PATCH } = await import("../src/app/api/posts/[id]/request-status/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce({ id: "user-1", username: "alice", role: "user" });
    updateRequestStatusForViewerMock.mockResolvedValueOnce({ status: "forbidden" });

    const response = await PATCH(
      new Request("http://localhost/api/posts/post-1/request-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestStatus: "processing" }),
      }),
      routeContext,
    );

    expect(response.status).toBe(403);
  });
});
