import type { CommunityUser } from "./types";
import { getCommunityName } from "./community-brand";

const communityName = getCommunityName();

export function buildMcpConnectionPrompt(input: {
  endpoint: string;
  apiKey: string;
  username: string;
}) {
  return [
    "请接入下面这个 MCP 服务：",
    "",
    `服务名称：${communityName} Community Hub`,
    `MCP 端点：${input.endpoint}`,
    `账号：${input.username}`,
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
