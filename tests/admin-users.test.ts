import { beforeEach, describe, expect, it, vi } from "vitest";

const txMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  session: {
    deleteMany: vi.fn(),
  },
}));

const prismaMock = vi.hoisted(() => ({
  user: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("../src/lib/db", () => ({
  prisma: prismaMock,
}));

describe("admin user services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof txMock) => unknown) => callback(txMock));
  });

  it("updates a user, allows shared room numbers, and disables access immediately", async () => {
    const { updateAdminUser } = await import("../src/lib/admin-users");

    txMock.user.findUnique
      .mockResolvedValueOnce({
        id: "user-1",
        username: "alice",
        roomNumber: "1-905",
        role: "user",
        disabledAt: null,
      })
      .mockResolvedValueOnce(null);
    txMock.session.deleteMany.mockResolvedValue({ count: 1 });
    txMock.user.update.mockResolvedValue({
      id: "user-1",
      username: "alice-new",
      roomNumber: "1-905",
      role: "user",
      disabledAt: new Date("2026-04-19T01:00:00.000Z"),
      createdAt: new Date("2026-04-19T00:00:00.000Z"),
      _count: {
        posts: 3,
        comments: 5,
      },
    });

    const result = await updateAdminUser("user-1", {
      username: "alice-new",
      roomNumber: "1-905",
      disabled: true,
    });

    expect(txMock.session.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(txMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: expect.objectContaining({
        username: "alice-new",
        name: "alice-new",
        roomNumber: "1-905",
        disabledAt: expect.any(Date),
        mcpTokenVersion: 0,
        mcpTokenIssuedAt: null,
      }),
      select: expect.any(Object),
    });
    expect(result).toEqual({
      id: "user-1",
      username: "alice-new",
      roomNumber: "1-905",
      role: "user",
      disabled: true,
      createdAt: "2026-04-19T00:00:00.000Z",
      postCount: 3,
      commentCount: 5,
    });
  });

  it("rejects username conflicts when editing a user", async () => {
    const { updateAdminUser } = await import("../src/lib/admin-users");

    txMock.user.findUnique
      .mockResolvedValueOnce({
        id: "user-1",
        username: "alice",
        roomNumber: "1-905",
        role: "user",
        disabledAt: null,
      })
      .mockResolvedValueOnce({
        id: "user-2",
        username: "taken",
      });

    await expect(
      updateAdminUser("user-1", {
        username: "taken",
      }),
    ).rejects.toThrowError("USERNAME_EXISTS");
  });

  it("prevents deleting admin accounts from the user management helpers", async () => {
    const { deleteAdminUser } = await import("../src/lib/admin-users");

    prismaMock.user.findUnique.mockResolvedValue({
      id: "admin-1",
      role: "admin",
    });

    await expect(deleteAdminUser("admin-1")).rejects.toThrowError("ADMIN_USER_READ_ONLY");
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
  });
});
