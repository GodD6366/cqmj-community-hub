import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserFromCookieMock = vi.hoisted(() => vi.fn());
const updateServiceTicketForViewerMock = vi.hoisted(() => vi.fn());
const deleteServiceTicketForViewerMock = vi.hoisted(() => vi.fn());

vi.mock("../src/lib/auth-server", () => ({
  getCurrentUserFromCookie: getCurrentUserFromCookieMock,
}));

vi.mock("../src/lib/resident-server", () => ({
  updateServiceTicketForViewer: updateServiceTicketForViewerMock,
  deleteServiceTicketForViewer: deleteServiceTicketForViewerMock,
}));

const routeContext = { params: Promise.resolve({ id: "ticket-1" }) };

const draft = {
  title: "更新后的工单",
  description: "更新后的说明",
  category: "repair",
};

describe("/api/service-tickets/[id] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated edits", async () => {
    const { PATCH } = await import("../src/app/api/service-tickets/[id]/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce(null);

    const response = await PATCH(
      new Request("http://localhost/api/service-tickets/ticket-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      }),
      routeContext,
    );

    expect(response.status).toBe(401);
    expect(updateServiceTicketForViewerMock).not.toHaveBeenCalled();
  });

  it("updates a ticket when the server allows it", async () => {
    const { PATCH } = await import("../src/app/api/service-tickets/[id]/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce({ id: "user-1", username: "alice", role: "user" });
    updateServiceTicketForViewerMock.mockResolvedValueOnce({ status: "ok" });

    const response = await PATCH(
      new Request("http://localhost/api/service-tickets/ticket-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      }),
      routeContext,
    );

    expect(response.status).toBe(200);
    expect(updateServiceTicketForViewerMock).toHaveBeenCalledWith(
      "ticket-1",
      { id: "user-1", username: "alice", role: "user" },
      draft,
    );
  });

  it("returns forbidden when editing another user's ticket", async () => {
    const { PATCH } = await import("../src/app/api/service-tickets/[id]/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce({ id: "user-1", username: "alice", role: "user" });
    updateServiceTicketForViewerMock.mockResolvedValueOnce({ status: "forbidden" });

    const response = await PATCH(
      new Request("http://localhost/api/service-tickets/ticket-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      }),
      routeContext,
    );

    expect(response.status).toBe(403);
  });

  it("deletes a ticket when the server allows it", async () => {
    const { DELETE } = await import("../src/app/api/service-tickets/[id]/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce({ id: "user-1", username: "alice", role: "user" });
    deleteServiceTicketForViewerMock.mockResolvedValueOnce({ status: "ok" });

    const response = await DELETE(
      new Request("http://localhost/api/service-tickets/ticket-1", { method: "DELETE" }),
      routeContext,
    );

    expect(response.status).toBe(200);
    expect(deleteServiceTicketForViewerMock).toHaveBeenCalledWith("ticket-1", {
      id: "user-1",
      username: "alice",
      role: "user",
    });
  });
});
