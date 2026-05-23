import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserFromCookieMock = vi.hoisted(() => vi.fn());
const ensureUserMcpAccessMock = vi.hoisted(() => vi.fn());
const getAppOriginMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth-server", () => ({
  getCurrentUserFromCookie: getCurrentUserFromCookieMock,
}));

vi.mock("@/lib/mcp-auth", () => ({
  ensureUserMcpAccess: ensureUserMcpAccessMock,
}));

vi.mock("@/lib/app-origin", () => ({
  getAppOrigin: getAppOriginMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("/mcp/connect page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redirectMock.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("redirects guests to the login page", async () => {
    getCurrentUserFromCookieMock.mockResolvedValue(null);

    const { default: McpConnectPage } = await import("../src/app/mcp/connect/page");
    await expect(
      McpConnectPage({
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith("/login?next=/mcp/connect");
  });

  it("passes token, endpoint, and welcome state to the client", async () => {
    getCurrentUserFromCookieMock.mockResolvedValue({ id: "user-1", username: "alice" });
    ensureUserMcpAccessMock.mockResolvedValue({
      token: "mcp_demo_token",
      user: {
        id: "user-1",
        username: "alice",
        roomNumber: "1-905",
        role: "user",
        mcpTokenVersion: 1,
        createdAt: "2026-05-23T00:00:00.000Z",
      },
    });
    getAppOriginMock.mockResolvedValue("https://community.example.com");

    const { default: McpConnectPage } = await import("../src/app/mcp/connect/page");
    const view = await McpConnectPage({
      searchParams: Promise.resolve({ welcome: "1" }),
    });

    expect(view.props.endpoint).toBe("https://community.example.com/mcp");
    expect(view.props.initialToken).toBe("mcp_demo_token");
    expect(view.props.welcome).toBe(true);
    expect(view.props.currentUser.username).toBe("alice");
  });

  it("renders a friendly fallback when MCP access cannot be prepared", async () => {
    getCurrentUserFromCookieMock.mockResolvedValue({ id: "user-1", username: "alice" });
    ensureUserMcpAccessMock.mockRejectedValue(new Error("DB_DOWN"));
    getAppOriginMock.mockResolvedValue("https://community.example.com");

    const { default: McpConnectPage } = await import("../src/app/mcp/connect/page");
    const view = await McpConnectPage({
      searchParams: Promise.resolve({}),
    });

    expect(typeof view.type).toBe("function");
    expect((view.type as { name?: string }).name).toBe("McpConnectUnavailableFallback");
  });
});
