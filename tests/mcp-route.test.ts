import { beforeEach, describe, expect, it, vi } from "vitest";
import { LATEST_PROTOCOL_VERSION } from "@modelcontextprotocol/sdk/types.js";

const verifyUserMcpTokenMock = vi.hoisted(() => vi.fn());
const listPostsForViewerMock = vi.hoisted(() => vi.fn());
const getPostForViewerMock = vi.hoisted(() => vi.fn());

vi.mock("../src/lib/mcp-auth", () => ({
  verifyUserMcpToken: verifyUserMcpTokenMock,
}));

vi.mock("../src/lib/community-server", () => ({
  listPostsForViewer: listPostsForViewerMock,
  getPostForViewer: getPostForViewerMock,
}));

function createPostRequest(body: unknown, headers: HeadersInit = {}) {
  return new Request("http://localhost:3000/mcp", {
    method: "POST",
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("/mcp route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyUserMcpTokenMock.mockResolvedValue({
      id: "userabc123",
      username: "godd",
      roomNumber: "1-905",
      role: "user",
      mcpTokenVersion: 1,
      createdAt: "2026-04-19T00:00:00.000Z",
    });
  });

  it("rejects missing bearer tokens and GET requests", async () => {
    const { GET, POST } = await import("../src/app/mcp/route");

    const getResponse = await GET();
    expect(getResponse.status).toBe(405);
    expect(getResponse.headers.get("allow")).toBe("POST");

    const postResponse = await POST(
      createPostRequest({
        jsonrpc: "2.0",
        id: "1",
        method: "initialize",
        params: {
          protocolVersion: LATEST_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: "test-client", version: "1.0.0" },
        },
      }),
    );

    expect(postResponse.status).toBe(401);
  });

  it("rejects requests that carry an Origin header", async () => {
    const { POST } = await import("../src/app/mcp/route");
    const response = await POST(
      createPostRequest(
        {
          jsonrpc: "2.0",
          id: "1",
          method: "initialize",
          params: {
            protocolVersion: LATEST_PROTOCOL_VERSION,
            capabilities: {},
            clientInfo: { name: "test-client", version: "1.0.0" },
          },
        },
        {
          authorization: "Bearer valid-token",
          origin: "https://example.com",
        },
      ),
    );

    expect(response.status).toBe(403);
  });

  it("initializes and lists tools for a valid token", async () => {
    const { POST } = await import("../src/app/mcp/route");

    const initializeResponse = await POST(
      createPostRequest(
        {
          jsonrpc: "2.0",
          id: "1",
          method: "initialize",
          params: {
            protocolVersion: LATEST_PROTOCOL_VERSION,
            capabilities: {},
            clientInfo: { name: "test-client", version: "1.0.0" },
          },
        },
        {
          authorization: "Bearer valid-token",
        },
      ),
    );

    expect(initializeResponse.status).toBe(200);
    const initializeBody = (await initializeResponse.json()) as { result?: { capabilities?: { tools?: object } } };
    expect(initializeBody.result?.capabilities?.tools).toBeDefined();

    const listResponse = await POST(
      createPostRequest(
        {
          jsonrpc: "2.0",
          id: "2",
          method: "tools/list",
          params: {},
        },
        {
          authorization: "Bearer valid-token",
          "mcp-protocol-version": LATEST_PROTOCOL_VERSION,
        },
      ),
    );

    expect(listResponse.status).toBe(200);
    const listBody = (await listResponse.json()) as { result?: { tools?: Array<{ name: string }> } };
    expect(listBody.result?.tools?.map((tool) => tool.name)).toEqual([
      "community.current_user",
      "community.list_posts",
      "community.get_post",
    ]);
  });

  it("returns viewer-scoped post data from tools", async () => {
    const { POST } = await import("../src/app/mcp/route");

    listPostsForViewerMock.mockResolvedValue([
      {
        id: "post-1",
        title: "私密求助",
        content: "只给自己看",
        category: "request",
        tags: ["维修"],
        authorName: "godd",
        createdAt: "2026-04-19T00:00:00.000Z",
        updatedAt: "2026-04-19T00:00:00.000Z",
        commentCount: 0,
        favoriteCount: 0,
        visibility: "private",
        status: "published",
        comments: [],
        pinned: false,
        featured: false,
      },
    ]);

    getPostForViewerMock
      .mockResolvedValueOnce({
        id: "post-1",
        title: "私密求助",
        content: "只给自己看",
        category: "request",
        tags: ["维修"],
        authorName: "godd",
        createdAt: "2026-04-19T00:00:00.000Z",
        updatedAt: "2026-04-19T00:00:00.000Z",
        commentCount: 0,
        favoriteCount: 0,
        visibility: "private",
        status: "published",
        comments: [],
        pinned: false,
        featured: false,
      })
      .mockResolvedValueOnce(null);

    const listResponse = await POST(
      createPostRequest(
        {
          jsonrpc: "2.0",
          id: "3",
          method: "tools/call",
          params: {
            name: "community.list_posts",
            arguments: { category: "request", limit: 5 },
          },
        },
        {
          authorization: "Bearer valid-token",
          "mcp-protocol-version": LATEST_PROTOCOL_VERSION,
        },
      ),
    );

    expect(listResponse.status).toBe(200);
    const listBody = (await listResponse.json()) as { result?: { structuredContent?: { posts?: Array<{ id: string }> } } };
    expect(listBody.result?.structuredContent?.posts?.[0]?.id).toBe("post-1");

    const visiblePostResponse = await POST(
      createPostRequest(
        {
          jsonrpc: "2.0",
          id: "4",
          method: "tools/call",
          params: {
            name: "community.get_post",
            arguments: { id: "post-1" },
          },
        },
        {
          authorization: "Bearer valid-token",
          "mcp-protocol-version": LATEST_PROTOCOL_VERSION,
        },
      ),
    );

    expect(visiblePostResponse.status).toBe(200);
    const visibleBody = (await visiblePostResponse.json()) as { result?: { structuredContent?: { post?: { id: string } } } };
    expect(visibleBody.result?.structuredContent?.post?.id).toBe("post-1");

    const hiddenPostResponse = await POST(
      createPostRequest(
        {
          jsonrpc: "2.0",
          id: "5",
          method: "tools/call",
          params: {
            name: "community.get_post",
            arguments: { id: "post-2" },
          },
        },
        {
          authorization: "Bearer valid-token",
          "mcp-protocol-version": LATEST_PROTOCOL_VERSION,
        },
      ),
    );

    expect(hiddenPostResponse.status).toBe(200);
    const hiddenBody = (await hiddenPostResponse.json()) as { result?: { isError?: boolean } };
    expect(hiddenBody.result?.isError).toBe(true);
  });
});
