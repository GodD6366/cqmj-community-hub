import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyUserSkillTokenMock = vi.hoisted(() => vi.fn());
const listPostsForViewerMock = vi.hoisted(() => vi.fn());
const createPostForViewerMock = vi.hoisted(() => vi.fn());
const getPostForViewerMock = vi.hoisted(() => vi.fn());
const addCommentForViewerMock = vi.hoisted(() => vi.fn());
const toggleFavoriteForViewerMock = vi.hoisted(() => vi.fn());
const reportPostForViewerMock = vi.hoisted(() => vi.fn());
const listPollsForViewerMock = vi.hoisted(() => vi.fn());
const createPollForViewerMock = vi.hoisted(() => vi.fn());
const votePollForViewerMock = vi.hoisted(() => vi.fn());
const getPublicImageBaseUrlMock = vi.hoisted(() => vi.fn());
const getUploadPrefixMock = vi.hoisted(() => vi.fn());

vi.mock("../src/lib/skill-auth", () => ({
  verifyUserSkillToken: verifyUserSkillTokenMock,
}));

vi.mock("../src/lib/community-server", () => ({
  listPostsForViewer: listPostsForViewerMock,
  createPostForViewer: createPostForViewerMock,
  getPostForViewer: getPostForViewerMock,
  addCommentForViewer: addCommentForViewerMock,
  toggleFavoriteForViewer: toggleFavoriteForViewerMock,
  reportPostForViewer: reportPostForViewerMock,
}));

vi.mock("../src/lib/resident-server", () => ({
  listPollsForViewer: listPollsForViewerMock,
  createPollForViewer: createPollForViewerMock,
  votePollForViewer: votePollForViewerMock,
}));

vi.mock("../src/lib/s3-storage", () => ({
  getPublicImageBaseUrl: getPublicImageBaseUrlMock,
  getUploadPrefix: getUploadPrefixMock,
}));

const viewer = {
  id: "userabc123",
  username: "godd",
  nickname: "Godd",
  roomNumber: "1-905",
  role: "user",
  skillTokenVersion: 1,
  createdAt: "2026-04-19T00:00:00.000Z",
};

function request(url: string, init: RequestInit = {}) {
  return new Request(url, {
    method: init.method ?? "GET",
    headers: {
      accept: "application/json",
      ...(init.body ? { "content-type": "application/json" } : {}),
      authorization: "Bearer valid-token",
      ...(init.headers ?? {}),
    },
    body: init.body,
  });
}

describe("/api/skill routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyUserSkillTokenMock.mockResolvedValue(viewer);
    getPublicImageBaseUrlMock.mockReturnValue("https://cdn.example.com");
    getUploadPrefixMock.mockReturnValue("posts");
  });

  it("rejects missing tokens, invalid tokens, and browser-originated requests", async () => {
    const { GET } = await import("../src/app/api/skill/me/route");

    const missing = await GET(new Request("http://localhost/api/skill/me"));
    expect(missing.status).toBe(401);
    expect(missing.headers.get("cache-control")).toBe("no-store");

    verifyUserSkillTokenMock.mockResolvedValueOnce(null);
    const invalid = await GET(request("http://localhost/api/skill/me"));
    expect(invalid.status).toBe(401);

    const browser = await GET(request("http://localhost/api/skill/me", { headers: { origin: "https://example.com" } }));
    expect(browser.status).toBe(403);
  });

  it("returns current Skill user", async () => {
    const { GET } = await import("../src/app/api/skill/me/route");
    const response = await GET(request("http://localhost/api/skill/me"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ user: viewer });
  });

  it("lists posts with filters and limit", async () => {
    const { GET } = await import("../src/app/api/skill/posts/route");
    listPostsForViewerMock.mockResolvedValue([
      { id: "post-1", title: "帖子 1" },
      { id: "post-2", title: "帖子 2" },
    ]);

    const response = await GET(request("http://localhost/api/skill/posts?filter=latest&category=discussion&limit=1"));

    expect(response.status).toBe(200);
    expect(listPostsForViewerMock).toHaveBeenCalledWith("userabc123", {
      filter: "latest",
      category: "discussion",
    });
    await expect(response.json()).resolves.toEqual({ posts: [{ id: "post-1", title: "帖子 1" }] });
  });

  it("creates a text post", async () => {
    const { POST } = await import("../src/app/api/skill/posts/route");
    createPostForViewerMock.mockResolvedValue("post-123");

    const response = await POST(request("http://localhost/api/skill/posts", {
      method: "POST",
      body: JSON.stringify({
        title: "闲置：餐椅转让",
        content: "九成新，可自提。",
        category: "secondhand",
        tags: ["闲置", "餐椅"],
        visibility: "community",
        anonymous: false,
        images: [],
      }),
    }));

    expect(response.status).toBe(201);
    expect(createPostForViewerMock).toHaveBeenCalledWith(viewer, expect.objectContaining({
      title: "闲置：餐椅转让",
      images: [],
    }));
    await expect(response.json()).resolves.toEqual({ id: "post-123" });
  });

  it("rejects invalid post creation payloads", async () => {
    const { POST } = await import("../src/app/api/skill/posts/route");
    const response = await POST(request("http://localhost/api/skill/posts", {
      method: "POST",
      body: JSON.stringify({ title: "", content: "内容", category: "discussion", tags: ["交流"], visibility: "community", images: [] }),
    }));

    expect(response.status).toBe(400);
    expect(createPostForViewerMock).not.toHaveBeenCalled();
  });

  it("gets post details with viewer permissions", async () => {
    const { GET } = await import("../src/app/api/skill/posts/[id]/route");
    getPostForViewerMock.mockResolvedValueOnce({ id: "post-1", title: "私密求助" }).mockResolvedValueOnce(null);

    const visible = await GET(request("http://localhost/api/skill/posts/post-1"), { params: Promise.resolve({ id: "post-1" }) });
    expect(visible.status).toBe(200);
    await expect(visible.json()).resolves.toEqual({ post: { id: "post-1", title: "私密求助" } });

    const hidden = await GET(request("http://localhost/api/skill/posts/post-2"), { params: Promise.resolve({ id: "post-2" }) });
    expect(hidden.status).toBe(404);
  });

  it("adds comments, toggles favorite, and reports posts", async () => {
    const commentsRoute = await import("../src/app/api/skill/posts/[id]/comments/route");
    const favoriteRoute = await import("../src/app/api/skill/posts/[id]/favorite/route");
    const reportRoute = await import("../src/app/api/skill/posts/[id]/report/route");
    const params = { params: Promise.resolve({ id: "post-1" }) };

    addCommentForViewerMock.mockResolvedValue({ id: "comment-1", content: "赞" });
    toggleFavoriteForViewerMock.mockResolvedValue({ favorited: true });
    reportPostForViewerMock.mockResolvedValue(true);

    const comment = await commentsRoute.POST(request("http://localhost/api/skill/posts/post-1/comments", {
      method: "POST",
      body: JSON.stringify({ content: "赞" }),
    }), params);
    expect(comment.status).toBe(201);
    expect(addCommentForViewerMock).toHaveBeenCalledWith("post-1", viewer, "赞");

    const favorite = await favoriteRoute.POST(request("http://localhost/api/skill/posts/post-1/favorite", {
      method: "POST",
      body: JSON.stringify({}),
    }), params);
    expect(favorite.status).toBe(200);
    await expect(favorite.json()).resolves.toEqual({ favorited: true });

    const report = await reportRoute.POST(request("http://localhost/api/skill/posts/post-1/report", {
      method: "POST",
      body: JSON.stringify({ reason: "垃圾信息" }),
    }), params);
    expect(report.status).toBe(200);
    expect(reportPostForViewerMock).toHaveBeenCalledWith("post-1", viewer, "垃圾信息");
  });

  it("lists and creates polls", async () => {
    const { GET, POST } = await import("../src/app/api/skill/polls/route");
    listPollsForViewerMock.mockResolvedValue([{ id: "poll-1", title: "周末活动" }]);
    createPollForViewerMock.mockResolvedValue("poll-2");

    const list = await GET(request("http://localhost/api/skill/polls?limit=20"));
    expect(list.status).toBe(200);
    expect(listPollsForViewerMock).toHaveBeenCalledWith("userabc123", 20);

    const create = await POST(request("http://localhost/api/skill/polls", {
      method: "POST",
      body: JSON.stringify({ title: "周末去哪", description: "选一个", options: ["公园", "球场"], endsAt: null }),
    }));
    expect(create.status).toBe(201);
    expect(createPollForViewerMock).toHaveBeenCalledWith(viewer, {
      title: "周末去哪",
      description: "选一个",
      options: ["公园", "球场"],
      endsAt: null,
    });
    await expect(create.json()).resolves.toEqual({ id: "poll-2" });
  });

  it("maps poll voting success and domain errors", async () => {
    const { POST } = await import("../src/app/api/skill/polls/[id]/vote/route");
    const params = { params: Promise.resolve({ id: "poll-1" }) };

    votePollForViewerMock.mockResolvedValueOnce(undefined);
    const ok = await POST(request("http://localhost/api/skill/polls/poll-1/vote", {
      method: "POST",
      body: JSON.stringify({ optionId: "option-1" }),
    }), params);
    expect(ok.status).toBe(200);
    expect(votePollForViewerMock).toHaveBeenCalledWith("poll-1", "option-1", viewer);

    votePollForViewerMock.mockRejectedValueOnce(new Error("POLL_ALREADY_VOTED"));
    const conflict = await POST(request("http://localhost/api/skill/polls/poll-1/vote", {
      method: "POST",
      body: JSON.stringify({ optionId: "option-1" }),
    }), params);
    expect(conflict.status).toBe(409);
  });
});

describe("/mcp route deprecation", () => {
  it("returns 410 Gone for old MCP endpoint", async () => {
    const { GET, POST } = await import("../src/app/mcp/route");
    const getResponse = await GET();
    expect(getResponse.status).toBe(410);
    await expect(getResponse.json()).resolves.toMatchObject({ skillConnectUrl: "/skill/connect" });

    const postResponse = await POST();
    expect(postResponse.status).toBe(410);
  });
});
