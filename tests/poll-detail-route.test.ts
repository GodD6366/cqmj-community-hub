import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserFromCookieMock = vi.hoisted(() => vi.fn());
const updatePollForViewerMock = vi.hoisted(() => vi.fn());
const deletePollForViewerMock = vi.hoisted(() => vi.fn());

vi.mock("../src/lib/auth-server", () => ({
  getCurrentUserFromCookie: getCurrentUserFromCookieMock,
}));

vi.mock("../src/lib/resident-server", () => ({
  updatePollForViewer: updatePollForViewerMock,
  deletePollForViewer: deletePollForViewerMock,
}));

const routeContext = { params: Promise.resolve({ id: "poll-1" }) };

const draft = {
  title: "更新后的投票",
  description: "更新后的说明",
  options: ["选项 A", "选项 B"],
  endsAt: null,
};

describe("/api/polls/[id] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated edits", async () => {
    const { PATCH } = await import("../src/app/api/polls/[id]/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce(null);

    const response = await PATCH(
      new Request("http://localhost/api/polls/poll-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      }),
      routeContext,
    );

    expect(response.status).toBe(401);
    expect(updatePollForViewerMock).not.toHaveBeenCalled();
  });

  it("updates a poll when the server allows it", async () => {
    const { PATCH } = await import("../src/app/api/polls/[id]/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce({ id: "user-1", username: "alice", role: "user" });
    updatePollForViewerMock.mockResolvedValueOnce({ status: "ok" });

    const response = await PATCH(
      new Request("http://localhost/api/polls/poll-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      }),
      routeContext,
    );

    expect(response.status).toBe(200);
    expect(updatePollForViewerMock).toHaveBeenCalledWith(
      "poll-1",
      { id: "user-1", username: "alice", role: "user" },
      {
        title: "更新后的投票",
        description: "更新后的说明",
        options: ["选项 A", "选项 B"],
        endsAt: null,
        status: undefined,
      },
    );
  });

  it("returns forbidden when editing another user's poll", async () => {
    const { PATCH } = await import("../src/app/api/polls/[id]/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce({ id: "user-1", username: "alice", role: "user" });
    updatePollForViewerMock.mockResolvedValueOnce({ status: "forbidden" });

    const response = await PATCH(
      new Request("http://localhost/api/polls/poll-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      }),
      routeContext,
    );

    expect(response.status).toBe(403);
  });

  it("deletes a poll when the server allows it", async () => {
    const { DELETE } = await import("../src/app/api/polls/[id]/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce({ id: "user-1", username: "alice", role: "user" });
    deletePollForViewerMock.mockResolvedValueOnce({ status: "ok" });

    const response = await DELETE(
      new Request("http://localhost/api/polls/poll-1", { method: "DELETE" }),
      routeContext,
    );

    expect(response.status).toBe(200);
    expect(deletePollForViewerMock).toHaveBeenCalledWith("poll-1", {
      id: "user-1",
      username: "alice",
      role: "user",
    });
  });
});
