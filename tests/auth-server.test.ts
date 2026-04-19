import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

const bcryptMock = vi.hoisted(() => ({
  hash: vi.fn(),
}));

vi.mock("../src/lib/db", () => ({
  prisma: prismaMock,
}));

vi.mock("bcryptjs", () => ({
  default: bcryptMock,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
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
