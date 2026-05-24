import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserFromCookieMock = vi.hoisted(() => vi.fn());
const ensureUserSkillAccessMock = vi.hoisted(() => vi.fn());
const getAppOriginMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth-server", () => ({
  getCurrentUserFromCookie: getCurrentUserFromCookieMock,
}));

vi.mock("@/lib/skill-auth", () => ({
  ensureUserSkillAccess: ensureUserSkillAccessMock,
  issueUserSkillBundleDownloadToken: vi.fn(() => ({
    token: "skilldl_demo_token",
    expiresAt: "2026-05-24T00:15:00.000Z",
  })),
}));

vi.mock("@/lib/app-origin", () => ({
  getAppOrigin: getAppOriginMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("/skill/connect page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redirectMock.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("redirects guests to the login page", async () => {
    getCurrentUserFromCookieMock.mockResolvedValue(null);

    const { default: SkillConnectPage } = await import("../src/app/skill/connect/page");
    await expect(
      SkillConnectPage({
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith("/login?next=/skill/connect");
  });

  it("passes token, API base, bundle URL, and welcome state to the client", async () => {
    getCurrentUserFromCookieMock.mockResolvedValue({ id: "user-1", username: "alice" });
    ensureUserSkillAccessMock.mockResolvedValue({
      token: "skill_demo_token",
      user: {
        id: "user-1",
        username: "alice",
        roomNumber: "1-905",
        role: "user",
        skillTokenVersion: 1,
        createdAt: "2026-05-23T00:00:00.000Z",
      },
    });
    getAppOriginMock.mockResolvedValue("https://community.example.com");

    const { default: SkillConnectPage } = await import("../src/app/skill/connect/page");
    const view = await SkillConnectPage({
      searchParams: Promise.resolve({ welcome: "1" }),
    });

    expect(view.props.apiBaseUrl).toBe("https://community.example.com/api/skill");
    expect(view.props.skillBundleUrl).toBe("https://community.example.com/api/skill/bundle?token=skilldl_demo_token");
    expect(view.props.bundleDownloadToken).toBe("skilldl_demo_token");
    expect(view.props.bundleDownloadTokenExpiresAt).toBe("2026-05-24T00:15:00.000Z");
    expect(view.props.initialToken).toBe("skill_demo_token");
    expect(view.props.welcome).toBe(true);
    expect(view.props.currentUser.username).toBe("alice");
  });

  it("renders a friendly fallback when Skill access cannot be prepared", async () => {
    getCurrentUserFromCookieMock.mockResolvedValue({ id: "user-1", username: "alice" });
    ensureUserSkillAccessMock.mockRejectedValue(new Error("DB_DOWN"));
    getAppOriginMock.mockResolvedValue("https://community.example.com");

    const { default: SkillConnectPage } = await import("../src/app/skill/connect/page");
    const view = await SkillConnectPage({
      searchParams: Promise.resolve({}),
    });

    expect(typeof view.type).toBe("function");
    expect((view.type as { name?: string }).name).toBe("SkillConnectUnavailableFallback");
  });
});

describe("/mcp/connect compatibility redirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redirectMock.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("redirects old MCP connect links to Skill connect", async () => {
    const { default: McpConnectPage } = await import("../src/app/mcp/connect/page");
    await expect(McpConnectPage({ searchParams: Promise.resolve({ welcome: "1" }) })).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/skill/connect?welcome=1");
  });
});
