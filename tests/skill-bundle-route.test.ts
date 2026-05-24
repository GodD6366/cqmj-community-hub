import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserFromCookieMock = vi.hoisted(() => vi.fn());
const ensureUserSkillAccessMock = vi.hoisted(() => vi.fn());
const verifyUserSkillBundleDownloadTokenMock = vi.hoisted(() => vi.fn());
const getAppOriginMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth-server", () => ({
  getCurrentUserFromCookie: getCurrentUserFromCookieMock,
}));

vi.mock("@/lib/skill-auth", () => ({
  ensureUserSkillAccess: ensureUserSkillAccessMock,
  verifyUserSkillBundleDownloadToken: verifyUserSkillBundleDownloadTokenMock,
}));

vi.mock("@/lib/app-origin", () => ({
  getAppOrigin: getAppOriginMock,
}));

function parseTar(buffer: Buffer) {
  const entries = new Map<string, Buffer>();
  for (let offset = 0; offset + 512 <= buffer.length; offset += 512) {
    const header = buffer.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
    const sizeText = header.subarray(124, 136).toString("ascii").replace(/\0.*$/, "").trim();
    const size = Number.parseInt(sizeText || "0", 8);
    const contentStart = offset + 512;
    entries.set(name, buffer.subarray(contentStart, contentStart + size));
    offset += Math.ceil(size / 512) * 512;
  }
  return entries;
}

describe("/api/skill/bundle route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserFromCookieMock.mockReset();
    ensureUserSkillAccessMock.mockReset();
    verifyUserSkillBundleDownloadTokenMock.mockReset();
    getAppOriginMock.mockReset();
    getCurrentUserFromCookieMock.mockResolvedValue({ id: "user-1", username: "alice" });
    ensureUserSkillAccessMock.mockResolvedValue({
      token: "skill_demo_token",
      user: { id: "user-1", username: "alice" },
    });
    verifyUserSkillBundleDownloadTokenMock.mockResolvedValue({
      token: "skill_demo_token",
      user: { id: "user-1", username: "alice" },
      expiresAt: "2026-05-24T00:15:00.000Z",
    });
    getAppOriginMock.mockResolvedValue("https://community.example.com");
  });

  it("requires login before serving a personalized skill bundle", async () => {
    getCurrentUserFromCookieMock.mockResolvedValueOnce(null);
    const { GET } = await import("../src/app/api/skill/bundle/route");

    const response = await GET(new Request("http://localhost/api/skill/bundle"));

    expect(response.status).toBe(401);
    expect(ensureUserSkillAccessMock).not.toHaveBeenCalled();
  });

  it("serves the Community Hub skill bundle with config.json credentials from a temporary download token", async () => {
    getCurrentUserFromCookieMock.mockResolvedValueOnce(null);
    const { GET } = await import("../src/app/api/skill/bundle/route");
    const response = await GET(new Request("http://localhost/api/skill/bundle?token=skilldl_demo_token"));
    const buffer = Buffer.from(await response.arrayBuffer());
    const entries = parseTar(buffer);
    const text = buffer.toString("utf8");

    expect(response.status).toBe(200);
    expect(verifyUserSkillBundleDownloadTokenMock).toHaveBeenCalledWith("skilldl_demo_token");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toBe("application/x-tar");
    expect([...entries.keys()]).toEqual([
      "community-hub/SKILL.md",
      "community-hub/agents/openai.yaml",
      "community-hub/scripts/community_hub.py",
      "community-hub/config.json",
    ]);

    const config = JSON.parse(entries.get("community-hub/config.json")!.toString("utf8"));
    expect(config).toEqual({
      apiBaseUrl: "https://community.example.com/api/skill",
      apiKey: "skill_demo_token",
      username: "alice",
    });
    expect(text).toContain("config.json");
    expect(text).not.toContain("COMMUNITY_HUB_API_BASE");
    expect(text).not.toContain("COMMUNITY_HUB_API_KEY");
  });

  it("serves the bundle using login state when no temporary token is supplied", async () => {
    const { GET } = await import("../src/app/api/skill/bundle/route");

    const response = await GET(new Request("http://localhost/api/skill/bundle"));

    expect(response.status).toBe(200);
    expect(ensureUserSkillAccessMock).toHaveBeenCalledWith("user-1");
  });
});
