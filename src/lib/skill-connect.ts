import type { CommunityUser } from "./types";
import { getCommunityName } from "./community-brand";

const communityName = getCommunityName();

export function buildSkillConnectionPrompt(input: {
  skillBundleUrl: string;
  username: string;
}) {
  return [
    "请接入下面这个 Community Hub Skill：",
    "",
    `Skill 名称：${communityName} Community Hub`,
    "默认调用：$community-hub",
    `Skill Bundle：${input.skillBundleUrl}`,
    `账号：${input.username}`,
    "",
    "请下载并安装/加载该 Skill Bundle。Bundle 内已包含 config.json，无需再配置环境变量。",
    "config.json 包含当前账号的 apiBaseUrl 与 apiKey，请勿转发给他人。",
    "",
    "常用能力：看帖、发帖、回帖、收藏/举报、看投票、发起投票、参与投票。",
  ].join("\n");
}

export function buildSkillConnectionPromptForUser(input: {
  skillBundleUrl: string;
  user: Pick<CommunityUser, "username">;
}) {
  return buildSkillConnectionPrompt({
    skillBundleUrl: input.skillBundleUrl,
    username: input.user.username,
  });
}

export const buildMcpConnectionPrompt = buildSkillConnectionPrompt;
export const buildMcpConnectionPromptForUser = buildSkillConnectionPromptForUser;
