import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  session: {
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
}));

const bcryptMock = vi.hoisted(() => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

const consumeInviteCodeMock = vi.hoisted(() => vi.fn());
const cookiesMock = vi.hoisted(() => vi.fn());

vi.mock("../src/lib/db", () => ({
  prisma: prismaMock,
}));

vi.mock("../src/lib/invite", () => ({
  consumeInviteCode: consumeInviteCodeMock,
}));

vi.mock("bcryptjs", () => ({
  default: bcryptMock,
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

const originalAdminUsername = process.env.COMMUNITY_ADMIN_USERNAME;
const originalAdminPassword = process.env.COMMUNITY_ADMIN_PASSWORD;

describe("admin bootstrap", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.create.mockReset();
    prismaMock.user.update.mockReset();
    bcryptMock.hash.mockReset();
    process.env.COMMUNITY_ADMIN_USERNAME = "admin";
    process.env.COMMUNITY_ADMIN_PASSWORD = "cqmjadmin";

    const { resetAdminBootstrapForTests } = await import("../src/lib/admin-bootstrap");
    resetAdminBootstrapForTests();
  });

  it("creates the default admin when missing", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    bcryptMock.hash.mockResolvedValue("hashed-admin-password");

    const { ensureAdminUserInitialized } = await import("../src/lib/admin-bootstrap");
    await ensureAdminUserInitialized();

    expect(bcryptMock.hash).toHaveBeenCalledWith("cqmjadmin", 10);
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        username: "admin",
        name: "admin",
        roomNumber: null,
        passwordHash: "hashed-admin-password",
        role: "admin",
      },
    });
  });

  it("promotes an existing same-name user to admin without resetting password", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "user-1", role: "user" });

    const { ensureAdminUserInitialized } = await import("../src/lib/admin-bootstrap");
    await ensureAdminUserInitialized();

    expect(bcryptMock.hash).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { role: "admin" },
    });
  });

  it("keeps an existing admin password unchanged", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "user-1", role: "admin" });

    const { ensureAdminUserInitialized } = await import("../src/lib/admin-bootstrap");
    await ensureAdminUserInitialized();

    expect(bcryptMock.hash).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});

describe("auth server", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.COMMUNITY_ADMIN_USERNAME = "admin";
    process.env.COMMUNITY_ADMIN_PASSWORD = "cqmjadmin";
    prismaMock.session.delete.mockResolvedValue({ id: "session-1" });

    const { resetAdminBootstrapForTests } = await import("../src/lib/admin-bootstrap");
    resetAdminBootstrapForTests();
  });

  it("allows registering different usernames to the same room number", async () => {
    const { registerUser } = await import("../src/lib/auth-server");

    prismaMock.user.findUnique.mockResolvedValue(null);
    consumeInviteCodeMock.mockResolvedValue({ id: "invite-1" });
    bcryptMock.hash.mockResolvedValue("hashed-password");
    prismaMock.user.create.mockResolvedValue({
      id: "user-1",
      username: "alice",
      name: "alice",
      roomNumber: "1-905",
      role: "user",
      mcpTokenVersion: 0,
      createdAt: new Date("2026-04-19T00:00:00.000Z"),
    });

    const user = await registerUser({
      username: "alice",
      password: "hunter2",
      inviteCode: "WELCOME-2026",
      roomNumber: "1-905",
    });

    expect(consumeInviteCodeMock).toHaveBeenCalledWith("WELCOME-2026");
    expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(1);
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        username: "alice",
        name: "alice",
        roomNumber: "1-905",
        passwordHash: "hashed-password",
      },
    });
    expect(user.username).toBe("alice");
  });

  it("rejects malformed room numbers during registration", async () => {
    const { registerUser } = await import("../src/lib/auth-server");

    await expect(
      registerUser({
        username: "alice",
        password: "hunter2",
        inviteCode: "WELCOME-2026",
        roomNumber: "905",
      }),
    ).rejects.toThrowError("INVALID_ROOM_NUMBER");
  });

  it("rejects disabled users during login", async () => {
    const { loginUser } = await import("../src/lib/auth-server");

    prismaMock.user.findUnique
      .mockResolvedValueOnce({ id: "admin-1", role: "admin" })
      .mockResolvedValueOnce({
        id: "user-1",
        username: "alice",
        passwordHash: "hashed-password",
        disabledAt: new Date("2026-04-19T00:00:00.000Z"),
      });

    await expect(loginUser({ username: "alice", password: "hunter2" })).rejects.toThrowError("USER_DISABLED");
    expect(bcryptMock.compare).not.toHaveBeenCalled();
  });

  it("invalidates stale sessions for disabled users", async () => {
    const { getCurrentUserFromCookie, SESSION_COOKIE } = await import("../src/lib/auth-server");

    cookiesMock.mockResolvedValue({
      get: (name: string) => (name === SESSION_COOKIE ? { value: "token-123" } : undefined),
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: "admin-1", role: "admin" });
    prismaMock.session.findUnique.mockResolvedValue({
      id: "session-1",
      token: "token-123",
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: "user-1",
        username: "alice",
        roomNumber: "1-905",
        role: "user",
        disabledAt: new Date("2026-04-19T00:00:00.000Z"),
        createdAt: new Date("2026-04-19T00:00:00.000Z"),
      },
    });

    await expect(getCurrentUserFromCookie()).resolves.toBeNull();
    expect(prismaMock.session.delete).toHaveBeenCalledWith({ where: { token: "token-123" } });
  });
});

describe("toCommunityUser", () => {
  beforeEach(() => {
    process.env.COMMUNITY_ADMIN_USERNAME = originalAdminUsername;
    process.env.COMMUNITY_ADMIN_PASSWORD = originalAdminPassword;
  });

  it("maps the user role into the community user shape", async () => {
    const { toCommunityUser } = await import("../src/lib/auth-server");
    const createdAt = new Date("2026-04-19T12:00:00.000Z");

    expect(
      toCommunityUser({
        id: "admin-1",
        username: "admin",
        roomNumber: null,
        role: "admin",
        mcpTokenVersion: 2,
        createdAt,
      }),
    ).toEqual({
      id: "admin-1",
      username: "admin",
      roomNumber: "",
      role: "admin",
      mcpTokenVersion: 2,
      createdAt: "2026-04-19T12:00:00.000Z",
    });
  });
});
