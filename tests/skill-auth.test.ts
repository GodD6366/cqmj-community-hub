import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  session: {
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("../src/lib/db", () => ({
  prisma: prismaMock,
}));

vi.mock("../src/lib/auth-server", () => ({
  isUserDisabled: vi.fn((user: { disabledAt?: Date | null }) => Boolean(user.disabledAt)),
  toCommunityUser: vi.fn((user: { id: string; username: string; name?: string | null; roomNumber?: string | null; role: "user" | "admin"; skillTokenVersion?: number; createdAt: Date }) => ({
    id: user.id,
    username: user.username,
    nickname: user.name ?? user.username,
    roomNumber: user.roomNumber ?? "",
    role: user.role,
    skillTokenVersion: user.skillTokenVersion ?? 0,
    createdAt: user.createdAt.toISOString(),
  })),
}));

describe("skill auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SKILL_SIGNING_SECRET = "test-secret";
    prismaMock.$transaction.mockImplementation(async (operations: unknown) => {
      if (Array.isArray(operations)) {
        return Promise.all(operations);
      }
      return null;
    });
  });

  it("issues and verifies a skill token for the current token version", async () => {
    const { issueUserSkillToken, verifyUserSkillToken } = await import("../src/lib/skill-auth");
    const createdAt = new Date("2026-04-19T00:00:00.000Z");
    const token = issueUserSkillToken({ id: "userabc123", skillTokenVersion: 1 });

    expect(token.startsWith("skill_userabc123_1_")).toBe(true);

    prismaMock.user.findUnique.mockResolvedValue({
      id: "userabc123",
      username: "godd",
      name: "Godd",
      roomNumber: "1-905",
      role: "user",
      disabledAt: null,
      skillTokenVersion: 1,
      createdAt,
    });

    await expect(verifyUserSkillToken(token)).resolves.toEqual({
      id: "userabc123",
      username: "godd",
      nickname: "Godd",
      roomNumber: "1-905",
      role: "user",
      skillTokenVersion: 1,
      createdAt: "2026-04-19T00:00:00.000Z",
    });
  });

  it("accepts legacy mcp-prefixed tokens during migration", async () => {
    const { issueUserMcpToken, verifyUserSkillToken } = await import("../src/lib/skill-auth");
    const createdAt = new Date("2026-04-19T00:00:00.000Z");
    const token = issueUserMcpToken({ id: "userabc123", skillTokenVersion: 1 }).replace(/^skill_/, "mcp_");

    prismaMock.user.findUnique.mockResolvedValue({
      id: "userabc123",
      username: "godd",
      name: null,
      roomNumber: "1-905",
      role: "user",
      disabledAt: null,
      skillTokenVersion: 1,
      createdAt,
    });

    await expect(verifyUserSkillToken(token)).resolves.toMatchObject({
      id: "userabc123",
      skillTokenVersion: 1,
    });
  });

  it("rejects tampered signatures, stale versions, and disabled users", async () => {
    const { issueUserSkillToken, verifyUserSkillToken } = await import("../src/lib/skill-auth");
    const token = issueUserSkillToken({ id: "userabc123", skillTokenVersion: 1 });

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "userabc123",
      username: "godd",
      name: null,
      roomNumber: "1-905",
      role: "user",
      disabledAt: null,
      skillTokenVersion: 2,
      createdAt: new Date("2026-04-19T00:00:00.000Z"),
    });

    await expect(verifyUserSkillToken(token)).resolves.toBeNull();
    await expect(verifyUserSkillToken(`${token.slice(0, -1)}x`)).resolves.toBeNull();

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "userabc123",
      username: "godd",
      name: null,
      roomNumber: "1-905",
      role: "user",
      disabledAt: new Date("2026-04-19T01:00:00.000Z"),
      skillTokenVersion: 1,
      createdAt: new Date("2026-04-19T00:00:00.000Z"),
    });

    await expect(verifyUserSkillToken(token)).resolves.toBeNull();
  });

  it("rotates to a new version and invalidates the old token", async () => {
    const { issueUserSkillToken, rotateUserSkillToken, verifyUserSkillToken } = await import("../src/lib/skill-auth");
    const oldToken = issueUserSkillToken({ id: "userabc123", skillTokenVersion: 1 });
    const createdAt = new Date("2026-04-19T00:00:00.000Z");

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "userabc123",
      disabledAt: null,
    });
    prismaMock.user.update.mockResolvedValueOnce({
      id: "userabc123",
      username: "godd",
      name: null,
      roomNumber: "1-905",
      role: "user",
      disabledAt: null,
      skillTokenVersion: 2,
      createdAt,
    });

    const rotated = await rotateUserSkillToken("userabc123");

    expect(rotated.user.skillTokenVersion).toBe(2);
    expect(rotated.token).not.toBe(oldToken);
    expect(rotated.token.startsWith("skill_")).toBe(true);

    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: "userabc123",
        username: "godd",
        name: null,
        roomNumber: "1-905",
        role: "user",
        disabledAt: null,
        skillTokenVersion: 2,
        createdAt,
      })
      .mockResolvedValueOnce({
        id: "userabc123",
        username: "godd",
        name: null,
        roomNumber: "1-905",
        role: "user",
        disabledAt: null,
        skillTokenVersion: 2,
        createdAt,
      });

    await expect(verifyUserSkillToken(oldToken)).resolves.toBeNull();
    await expect(verifyUserSkillToken(rotated.token)).resolves.toMatchObject({
      id: "userabc123",
      skillTokenVersion: 2,
    });
  });

  it("issues and verifies temporary bundle download tokens", async () => {
    vi.setSystemTime(new Date("2026-05-24T00:00:00.000Z"));
    const { issueUserSkillBundleDownloadToken, verifyUserSkillBundleDownloadToken } = await import("../src/lib/skill-auth");
    const issued = issueUserSkillBundleDownloadToken({ id: "userabc123", skillTokenVersion: 1 });

    expect(issued.token.startsWith("skilldl_userabc123_1_")).toBe(true);
    expect(issued.expiresAt).toBe("2026-05-24T00:15:00.000Z");

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "userabc123",
      username: "godd",
      name: "Godd",
      roomNumber: "1-905",
      role: "user",
      disabledAt: null,
      skillTokenVersion: 1,
      createdAt: new Date("2026-04-19T00:00:00.000Z"),
    });

    await expect(verifyUserSkillBundleDownloadToken(issued.token)).resolves.toMatchObject({
      token: expect.stringMatching(/^skill_userabc123_1_/),
      expiresAt: "2026-05-24T00:15:00.000Z",
      user: { id: "userabc123", skillTokenVersion: 1 },
    });

    vi.setSystemTime(new Date("2026-05-24T00:15:01.000Z"));
    await expect(verifyUserSkillBundleDownloadToken(issued.token)).resolves.toBeNull();
    vi.useRealTimers();
  });

  it("clears sessions and rejects rotation for disabled users", async () => {
    const { rotateUserSkillToken } = await import("../src/lib/skill-auth");

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "userabc123",
      disabledAt: new Date("2026-04-19T01:00:00.000Z"),
    });
    prismaMock.session.deleteMany.mockResolvedValue({ count: 2 });
    prismaMock.user.update.mockResolvedValue({ id: "userabc123", skillTokenVersion: 0 });

    await expect(rotateUserSkillToken("userabc123")).rejects.toThrowError("USER_DISABLED");
    expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({ where: { userId: "userabc123" } });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "userabc123" },
      data: {
        skillTokenVersion: 0,
        skillTokenIssuedAt: null,
      },
    });
  });
});
