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
    `当前账号：${input.username}`,
    `认证方式：Bearer Token`,
    `API Key：${input.apiKey}`,
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
