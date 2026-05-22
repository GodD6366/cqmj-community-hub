import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserFromCookieMock = vi.hoisted(() => vi.fn());
const listNotificationsForViewerMock = vi.hoisted(() => vi.fn());
const countUnreadNotificationsForViewerMock = vi.hoisted(() => vi.fn());
const markNotificationsReadForViewerMock = vi.hoisted(() => vi.fn());

vi.mock("../src/lib/auth-server", () => ({
  getCurrentUserFromCookie: getCurrentUserFromCookieMock,
}));

vi.mock("../src/lib/resident-server", () => ({
  listNotificationsForViewer: listNotificationsForViewerMock,
  countUnreadNotificationsForViewer: countUnreadNotificationsForViewerMock,
  markNotificationsReadForViewer: markNotificationsReadForViewerMock,
}));

describe("/api/notifications route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns guest-safe empty payload for GET", async () => {
    const { GET } = await import("../src/app/api/notifications/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce(null);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      notifications: [],
      unreadNotificationCount: 0,
    });
  });

  it("marks all notifications as read", async () => {
    const { PATCH } = await import("../src/app/api/notifications/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce({ id: "user-1", username: "alice" });
    markNotificationsReadForViewerMock.mockResolvedValueOnce(3);

    const response = await PATCH(
      new Request("http://localhost/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(200);
    expect(markNotificationsReadForViewerMock).toHaveBeenCalledWith("user-1", undefined);
    await expect(response.json()).resolves.toEqual({ ok: true, count: 3 });
  });

  it("marks selected notifications as read", async () => {
    const { PATCH } = await import("../src/app/api/notifications/route");
    getCurrentUserFromCookieMock.mockResolvedValueOnce({ id: "user-1", username: "alice" });
    markNotificationsReadForViewerMock.mockResolvedValueOnce(1);

    const response = await PATCH(
      new Request("http://localhost/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ["notice-1"] }),
      }),
    );

    expect(response.status).toBe(200);
    expect(markNotificationsReadForViewerMock).toHaveBeenCalledWith("user-1", ["notice-1"]);
  });
});
