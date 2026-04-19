import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("../src/lib/db", () => ({
  prisma: prismaMock,
}));

vi.mock("../src/lib/auth-server", () => ({
  toCommunityUser: vi.fn((user: { id: string; username: string; roomNumber?: string | null; role: "user" | "admin"; mcpTokenVersion?: number; createdAt: Date }) => ({
    id: user.id,
    username: user.username,
    roomNumber: user.roomNumber ?? "",
    role: user.role,
    mcpTokenVersion: user.mcpTokenVersion ?? 0,
    createdAt: user.createdAt.toISOString(),
  })),
}));

describe("mcp auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MCP_SIGNING_SECRET = "test-secret";
  });

  it("issues and verifies a token for the current token version", async () => {
    const { issueUserMcpToken, verifyUserMcpToken } = await import("../src/lib/mcp-auth");
    const createdAt = new Date("2026-04-19T00:00:00.000Z");
    const token = issueUserMcpToken({ id: "userabc123", mcpTokenVersion: 1 });

    prismaMock.user.findUnique.mockResolvedValue({
      id: "userabc123",
      username: "godd",
      roomNumber: "1-905",
      role: "user",
      mcpTokenVersion: 1,
      createdAt,
    });

    await expect(verifyUserMcpToken(token)).resolves.toEqual({
      id: "userabc123",
      username: "godd",
      roomNumber: "1-905",
      role: "user",
      mcpTokenVersion: 1,
      createdAt: "2026-04-19T00:00:00.000Z",
    });
  });

  it("rejects tampered signatures and stale versions", async () => {
    const { issueUserMcpToken, verifyUserMcpToken } = await import("../src/lib/mcp-auth");
    const token = issueUserMcpToken({ id: "userabc123", mcpTokenVersion: 1 });

    prismaMock.user.findUnique.mockResolvedValue({
      id: "userabc123",
      username: "godd",
      roomNumber: "1-905",
      role: "user",
      mcpTokenVersion: 2,
      createdAt: new Date("2026-04-19T00:00:00.000Z"),
    });

    await expect(verifyUserMcpToken(token)).resolves.toBeNull();
    await expect(verifyUserMcpToken(`${token.slice(0, -1)}x`)).resolves.toBeNull();
  });

  it("rotates to a new version and invalidates the old token", async () => {
    const { issueUserMcpToken, rotateUserMcpToken, verifyUserMcpToken } = await import("../src/lib/mcp-auth");
    const oldToken = issueUserMcpToken({ id: "userabc123", mcpTokenVersion: 1 });
    const createdAt = new Date("2026-04-19T00:00:00.000Z");

    prismaMock.user.update.mockResolvedValue({
      id: "userabc123",
      username: "godd",
      roomNumber: "1-905",
      role: "user",
      mcpTokenVersion: 2,
      createdAt,
    });

    const rotated = await rotateUserMcpToken("userabc123");

    expect(rotated.user.mcpTokenVersion).toBe(2);
    expect(rotated.token).not.toBe(oldToken);

    prismaMock.user.findUnique.mockResolvedValue({
      id: "userabc123",
      username: "godd",
      roomNumber: "1-905",
      role: "user",
      mcpTokenVersion: 2,
      createdAt,
    });

    await expect(verifyUserMcpToken(oldToken)).resolves.toBeNull();
    await expect(verifyUserMcpToken(rotated.token)).resolves.toEqual({
      id: "userabc123",
      username: "godd",
      roomNumber: "1-905",
      role: "user",
      mcpTokenVersion: 2,
      createdAt: "2026-04-19T00:00:00.000Z",
    });
  });
});
