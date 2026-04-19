import type { CommunityUser } from "./types";

export function buildMcpConnectionPrompt(input: {
  endpoint: string;
  apiKey: string;
  username: string;
}) {
  return [
    "请把下面这个 MCP 服务接入到你的平台：",
    "",
    `服务名称：邻里圈 Community Hub`,
    `MCP 端点：${input.endpoint}`,
    `认证方式：Bearer Token`,
    `API Key：${input.apiKey}`,
    "",
    "连接成功后，你可以调用这些工具：",
    "- community.current_user",
    "- community.list_posts",
    "- community.get_post",
    "",
    `当前账号：${input.username}`,
    "这是一个只读 MCP 服务，请不要尝试写入或修改社区数据。",
  ].join("\n");
}

export function buildMcpConnectionPromptForUser(input: {
  endpoint: string;
  apiKey: string;
  user: Pick<CommunityUser, "username">;
}) {
  return buildMcpConnectionPrompt({
    endpoint: input.endpoint,
    apiKey: input.apiKey,
    username: input.user.username,
  });
}
