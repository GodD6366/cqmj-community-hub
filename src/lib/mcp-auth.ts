import {
  ensureUserSkillAccess,
  issueUserSkillToken,
  rotateUserSkillToken,
  verifyUserSkillToken,
} from "./skill-auth";

export {
  ensureUserSkillAccess,
  issueUserSkillToken,
  rotateUserSkillToken,
  verifyUserSkillToken,
};

export function issueUserMcpToken(user: { id: string; mcpTokenVersion?: number; skillTokenVersion?: number }) {
  return issueUserSkillToken({
    id: user.id,
    skillTokenVersion: user.skillTokenVersion ?? user.mcpTokenVersion ?? 0,
  });
}

export const ensureUserMcpAccess = ensureUserSkillAccess;
export const rotateUserMcpToken = rotateUserSkillToken;
export const verifyUserMcpToken = verifyUserSkillToken;
