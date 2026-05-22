import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserFromCookieMock = vi.hoisted(() => vi.fn());
const isAdminUserMock = vi.hoisted(() => vi.fn());
const updatePollForAdminMock = vi.hoisted(() => vi.fn());
const deletePollForAdminMock = vi.hoisted(() => vi.fn());

vi.mock("../src/lib/auth-server", () => ({
  getCurrentUserFromCookie: getCurrentUserFromCookieMock,
  isAdminUser: isAdminUserMock,
}));

vi.mock("../src/lib/resident-server", () => ({
  updatePollForAdmin: updatePollForAdminMock,
  deletePollForAdmin: deletePollForAdminMock,
}));

const routeContext = { params: Promise.resolve({ id: "poll-1" }) };

describe("/api/admin/polls/[id] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid poll statuses", async () => {
    const { PATCH } = await import("../src/app/api/admin/polls/[id]/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce({ id: "admin-1", role: "admin" });
    isAdminUserMock.mockReturnValueOnce(true);

    const response = await PATCH(
      new Request("http://localhost/api/admin/polls/poll-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "bad" }),
      }),
      routeContext,
    );

    expect(response.status).toBe(400);
    expect(updatePollForAdminMock).not.toHaveBeenCalled();
  });

  it("updates poll moderation fields", async () => {
    const { PATCH } = await import("../src/app/api/admin/polls/[id]/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce({ id: "admin-1", role: "admin" });
    isAdminUserMock.mockReturnValueOnce(true);
    updatePollForAdminMock.mockResolvedValueOnce({ id: "poll-1", status: "closed" });

    const response = await PATCH(
      new Request("http://localhost/api/admin/polls/poll-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed", endsAt: null }),
      }),
      routeContext,
    );

    expect(response.status).toBe(200);
    expect(updatePollForAdminMock).toHaveBeenCalledWith("poll-1", {
      title: undefined,
      description: undefined,
      endsAt: null,
      status: "closed",
    });
  });

  it("deletes polls for admins", async () => {
    const { DELETE } = await import("../src/app/api/admin/polls/[id]/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce({ id: "admin-1", role: "admin" });
    isAdminUserMock.mockReturnValueOnce(true);
    deletePollForAdminMock.mockResolvedValueOnce(true);

    const response = await DELETE(new Request("http://localhost/api/admin/polls/poll-1", { method: "DELETE" }), routeContext);

    expect(response.status).toBe(200);
    expect(deletePollForAdminMock).toHaveBeenCalledWith("poll-1");
  });
});
