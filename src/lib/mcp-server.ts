import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { getPostForViewer, listPostsForViewer } from "./community-server";
import type { CommunityUser, PostCategory } from "./types";

const postCategorySchema = z.enum(["request", "secondhand", "discussion", "play"]);

function summarizePost(post: Awaited<ReturnType<typeof listPostsForViewer>>[number]) {
  return {
    id: post.id,
    title: post.title,
    category: post.category,
    tags: post.tags,
    authorName: post.authorName,
    createdAt: post.createdAt,
    commentCount: post.commentCount,
    favoriteCount: post.favoriteCount,
    pinned: Boolean(post.pinned),
    featured: Boolean(post.featured),
    visibility: post.visibility,
  };
}

function textResult(text: string, structuredContent?: Record<string, unknown>, isError = false) {
  return {
    content: [{ type: "text" as const, text }],
    structuredContent,
    isError,
  };
}

export function createCommunityMcpServer(viewer: CommunityUser) {
  const server = new McpServer({
    name: "community-hub",
    version: "0.1.0",
  });

  server.registerTool(
    "community.current_user",
    {
      description: "返回当前 MCP token 对应的社区用户信息。",
    },
    async () =>
      textResult(
        JSON.stringify({ user: viewer }, null, 2),
        { user: viewer },
      ),
  );

  server.registerTool(
    "community.list_posts",
    {
      description: "返回当前用户可见的帖子列表，支持按分类筛选。",
      inputSchema: {
        category: postCategorySchema.optional(),
        limit: z.number().int().min(1).max(20).default(10),
      },
    },
    async ({ category, limit }) => {
      const posts = await listPostsForViewer(viewer.id);
      const filteredPosts = posts
        .filter((post) => !category || post.category === (category as PostCategory))
        .slice(0, limit)
        .map(summarizePost);

      return textResult(
        JSON.stringify({ posts: filteredPosts }, null, 2),
        { posts: filteredPosts },
      );
    },
  );

  server.registerTool(
    "community.get_post",
    {
      description: "按帖子 id 读取当前用户可见的单帖详情。",
      inputSchema: {
        id: z.string().min(1),
      },
    },
    async ({ id }) => {
      const post = await getPostForViewer(id, viewer.id);
      if (!post) {
        return textResult("帖子不存在，或你没有访问权限。", { id }, true);
      }

      return textResult(
        JSON.stringify({ post }, null, 2),
        { post },
      );
    },
  );

  return server;
}
