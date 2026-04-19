import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createCommunityMcpServer } from "../../lib/mcp-server";
import { verifyUserMcpToken } from "../../lib/mcp-auth";

export const runtime = "nodejs";

function jsonRpcError(status: number, code: number, message: string) {
  return Response.json(
    {
      jsonrpc: "2.0",
      error: { code, message },
      id: null,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token.trim();
}

export async function POST(request: Request) {
  if (request.headers.get("origin")) {
    return jsonRpcError(403, -32000, "Browser-originated requests are not allowed.");
  }

  const token = readBearerToken(request);
  if (!token) {
    return jsonRpcError(401, -32001, "Missing bearer token.");
  }

  const viewer = await verifyUserMcpToken(token);
  if (!viewer) {
    return jsonRpcError(401, -32001, "Invalid or expired bearer token.");
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = createCommunityMcpServer(viewer);

  try {
    await server.connect(transport);
    return await transport.handleRequest(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return jsonRpcError(500, -32603, message);
  } finally {
    await transport.close().catch(() => undefined);
    await server.close().catch(() => undefined);
  }
}

export async function GET() {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: {
      Allow: "POST",
      "Cache-Control": "no-store",
    },
  });
}
