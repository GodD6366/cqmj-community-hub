import type { CommunityUser } from "./types";
import { getCommunityName } from "./community-brand";

const communityName = getCommunityName();

export function buildSkillConnectionPrompt(input: {
  skillBundleUrl: string;
  bundleDownloadToken: string;
  bundleDownloadTokenExpiresAt: string;
  username: string;
}) {
  return [
    "请接入下面这个 Community Hub Skill：",
    "",
    `Skill 名称：${communityName} Community Hub`,
    "默认调用：$community-hub",
    `Skill Bundle：${input.skillBundleUrl}`,
    `Token 有效期至：${input.bundleDownloadTokenExpiresAt}`,
    `账号：${input.username}`,
    "",
    "请用上面的临时 token 下载并安装/加载该 Skill Bundle。临时 token 只用于下载 bundle;",
    "",
    "常用能力：看帖、发帖、回帖、收藏/举报、看投票、发起投票、参与投票。",
    "",
    "💡 Tips：接入成功后，你可以跟我说「如果有人请求我协助，请主动通知我」，我会定时帮你留意社区的求助动态！",
  ].join("\n");
}

export function buildSkillConnectionPromptForUser(input: {
  skillBundleUrl: string;
  bundleDownloadToken: string;
  bundleDownloadTokenExpiresAt: string;
  user: Pick<CommunityUser, "username">;
}) {
  return buildSkillConnectionPrompt({
    skillBundleUrl: input.skillBundleUrl,
    bundleDownloadToken: input.bundleDownloadToken,
    bundleDownloadTokenExpiresAt: input.bundleDownloadTokenExpiresAt,
    username: input.user.username,
  });
}

export const buildMcpConnectionPrompt = buildSkillConnectionPrompt;
export const buildMcpConnectionPromptForUser = buildSkillConnectionPromptForUser;
