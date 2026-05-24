import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "./db";
import { isUserDisabled, toCommunityUser } from "./auth-server";

const TOKEN_PREFIX = "skill";
const LEGACY_TOKEN_PREFIX = "mcp";

function getSkillSigningSecret() {
  const secret = process.env.SKILL_SIGNING_SECRET?.trim();
  if (!secret) {
    throw new Error("SKILL_SIGNING_SECRET is required");
  }
  return secret;
}

function signTokenPayload(userId: string, version: number) {
  return createHmac("sha256", getSkillSigningSecret())
    .update(`${userId}:${version}`)
    .digest("base64url");
}

function parseToken(token: string) {
  const match = /^(skill|mcp)_([a-z0-9]+)_([1-9]\d*)_([A-Za-z0-9_-]+)$/.exec(token);
  if (!match) {
    return null;
  }

  const [, prefix, userId, versionValue, signature] = match;
  const version = Number(versionValue);

  if (!Number.isSafeInteger(version) || version <= 0) {
    return null;
  }

  return { prefix, userId, version, signature };
}

function signaturesMatch(expected: string, actual: string) {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function userSelect() {
  return {
    id: true,
    username: true,
    name: true,
    roomNumber: true,
    role: true,
    disabledAt: true,
    skillTokenVersion: true,
    createdAt: true,
  } as const;
}

export function issueUserSkillToken(user: { id: string; skillTokenVersion: number }) {
  if (user.skillTokenVersion <= 0) {
    throw new Error("SKILL_TOKEN_NOT_ISSUED");
  }

  const signature = signTokenPayload(user.id, user.skillTokenVersion);
  return `${TOKEN_PREFIX}_${user.id}_${user.skillTokenVersion}_${signature}`;
}

export async function ensureUserSkillAccess(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect(),
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (isUserDisabled(user)) {
    await prisma.$transaction([
      prisma.session.deleteMany({ where: { userId } }),
      prisma.user.update({
        where: { id: userId },
        data: {
          skillTokenVersion: 0,
          skillTokenIssuedAt: null,
        },
      }),
    ]);
    throw new Error("USER_DISABLED");
  }

  const now = new Date();

  const ensured =
    user.skillTokenVersion > 0
      ? await prisma.user.update({
          where: { id: userId },
          data: { skillGuideSeenAt: now },
          select: userSelect(),
        })
      : await prisma.user.update({
          where: { id: userId },
          data: {
            skillTokenVersion: 1,
            skillTokenIssuedAt: now,
            skillGuideSeenAt: now,
          },
          select: userSelect(),
        });

  return {
    user: toCommunityUser(ensured),
    token: issueUserSkillToken(ensured),
  };
}

export async function rotateUserSkillToken(userId: string) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      disabledAt: true,
    },
  });

  if (!existing) {
    throw new Error("USER_NOT_FOUND");
  }

  if (isUserDisabled(existing)) {
    await prisma.$transaction([
      prisma.session.deleteMany({ where: { userId } }),
      prisma.user.update({
        where: { id: userId },
        data: {
          skillTokenVersion: 0,
          skillTokenIssuedAt: null,
        },
      }),
    ]);
    throw new Error("USER_DISABLED");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      skillTokenVersion: { increment: 1 },
      skillTokenIssuedAt: new Date(),
      skillGuideSeenAt: new Date(),
    },
    select: userSelect(),
  });

  return {
    user: toCommunityUser(user),
    token: issueUserSkillToken(user),
  };
}

export async function verifyUserSkillToken(token: string) {
  const parsed = parseToken(token);
  if (!parsed) {
    return null;
  }

  if (parsed.prefix !== TOKEN_PREFIX && parsed.prefix !== LEGACY_TOKEN_PREFIX) {
    return null;
  }

  const expectedSignature = signTokenPayload(parsed.userId, parsed.version);
  if (!signaturesMatch(expectedSignature, parsed.signature)) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: parsed.userId },
    select: userSelect(),
  });

  if (!user || isUserDisabled(user) || user.skillTokenVersion !== parsed.version || user.skillTokenVersion <= 0) {
    return null;
  }

  return toCommunityUser(user);
}

export function issueUserMcpToken(user: { id: string; mcpTokenVersion?: number; skillTokenVersion?: number }) {
  return issueUserSkillToken({
    id: user.id,
    skillTokenVersion: user.skillTokenVersion ?? user.mcpTokenVersion ?? 0,
  });
}

export const ensureUserMcpAccess = ensureUserSkillAccess;
export const rotateUserMcpToken = rotateUserSkillToken;
export const verifyUserMcpToken = verifyUserSkillToken;
