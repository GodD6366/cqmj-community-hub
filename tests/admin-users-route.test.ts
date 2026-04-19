import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserFromCookieMock = vi.hoisted(() => vi.fn());
const isAdminUserMock = vi.hoisted(() => vi.fn());
const listAdminUsersMock = vi.hoisted(() => vi.fn());
const updateAdminUserMock = vi.hoisted(() => vi.fn());
const deleteAdminUserMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth-server", () => ({
  getCurrentUserFromCookie: getCurrentUserFromCookieMock,
  isAdminUser: isAdminUserMock,
}));

vi.mock("@/lib/admin-users", () => ({
  listAdminUsers: listAdminUsersMock,
  updateAdminUser: updateAdminUserMock,
  deleteAdminUser: deleteAdminUserMock,
}));

describe("admin user routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("guards the list route for admins and returns user status fields", async () => {
    const { GET } = await import("../src/app/api/admin/users/route");

    getCurrentUserFromCookieMock.mockResolvedValueOnce(null);
    const unauthenticated = await GET();
    expect(unauthenticated.status).toBe(401);

    getCurrentUserFromCookieMock.mockResolvedValueOnce({ id: "user-1", role: "user" });
    isAdminUserMock.mockReturnValueOnce(false);
    const forbidden = await GET();
    expect(forbidden.status).toBe(403);

    getCurrentUserFromCookieMock.mockResolvedValueOnce({ id: "admin-1", role: "admin" });
    isAdminUserMock.mockReturnValueOnce(true);
    listAdminUsersMock.mockResolvedValueOnce([
      {
        id: "user-1",
        username: "alice",
        roomNumber: "1-905",
        role: "user",
        disabled: true,
        createdAt: "2026-04-19T00:00:00.000Z",
        postCount: 1,
        commentCount: 2,
      },
    ]);

    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      users: [
        {
          id: "user-1",
          username: "alice",
          roomNumber: "1-905",
          role: "user",
          disabled: true,
          createdAt: "2026-04-19T00:00:00.000Z",
          postCount: 1,
          commentCount: 2,
        },
      ],
    });
  });

  it("updates users and blocks self-disable for the current admin", async () => {
    const { PATCH } = await import("../src/app/api/admin/users/[id]/route");

    getCurrentUserFromCookieMock.mockResolvedValue({ id: "admin-1", role: "admin" });
    isAdminUserMock.mockReturnValue(true);

    const selfDisableResponse = await PATCH(
      new Request("http://localhost/api/admin/users/admin-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled: true }),
      }),
      { params: Promise.resolve({ id: "admin-1" }) },
    );
    expect(selfDisableResponse.status).toBe(400);

    updateAdminUserMock.mockResolvedValueOnce({
      id: "user-1",
      username: "alice-new",
      roomNumber: "1-905",
      role: "user",
      disabled: false,
      createdAt: "2026-04-19T00:00:00.000Z",
      postCount: 1,
      commentCount: 2,
    });

    const response = await PATCH(
      new Request("http://localhost/api/admin/users/user-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "alice-new", roomNumber: "1-905", disabled: false }),
      }),
      { params: Promise.resolve({ id: "user-1" }) },
    );

    expect(response.status).toBe(200);
    expect(updateAdminUserMock).toHaveBeenCalledWith("user-1", {
      username: "alice-new",
      roomNumber: "1-905",
      disabled: false,
    });
  });

  it("blocks self-delete for the current admin", async () => {
    const { DELETE } = await import("../src/app/api/admin/users/[id]/route");

    getCurrentUserFromCookieMock.mockResolvedValue({ id: "admin-1", role: "admin" });
    isAdminUserMock.mockReturnValue(true);

    const response = await DELETE(new Request("http://localhost/api/admin/users/admin-1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "admin-1" }),
    });

    expect(response.status).toBe(400);
    expect(deleteAdminUserMock).not.toHaveBeenCalled();
  });
});
