import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "./db";
import { isUserDisabled, toCommunityUser } from "./auth-server";

const TOKEN_PREFIX = "mcp";

function getMcpSigningSecret() {
  const secret = process.env.MCP_SIGNING_SECRET?.trim();
  if (!secret) {
    throw new Error("MCP_SIGNING_SECRET is required");
  }
  return secret;
}

function signTokenPayload(userId: string, version: number) {
  return createHmac("sha256", getMcpSigningSecret())
    .update(`${userId}:${version}`)
    .digest("base64url");
}

function parseToken(token: string) {
  const match = /^mcp_([a-z0-9]+)_([1-9]\d*)_([A-Za-z0-9_-]+)$/.exec(token);
  if (!match) {
    return null;
  }

  const [, userId, versionValue, signature] = match;
  const version = Number(versionValue);

  if (!Number.isSafeInteger(version) || version <= 0) {
    return null;
  }

  return { userId, version, signature };
}

function signaturesMatch(expected: string, actual: string) {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function issueUserMcpToken(user: { id: string; mcpTokenVersion: number }) {
  if (user.mcpTokenVersion <= 0) {
    throw new Error("MCP_TOKEN_NOT_ISSUED");
  }

  const signature = signTokenPayload(user.id, user.mcpTokenVersion);
  return `${TOKEN_PREFIX}_${user.id}_${user.mcpTokenVersion}_${signature}`;
}

export async function ensureUserMcpAccess(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      roomNumber: true,
      role: true,
      disabledAt: true,
      mcpTokenVersion: true,
      createdAt: true,
    },
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
          mcpTokenVersion: 0,
          mcpTokenIssuedAt: null,
        },
      }),
    ]);
    throw new Error("USER_DISABLED");
  }

  const now = new Date();

  const ensured =
    user.mcpTokenVersion > 0
      ? await prisma.user.update({
          where: { id: userId },
          data: user.mcpTokenVersion > 0 ? { mcpGuideSeenAt: now } : {},
          select: {
            id: true,
            username: true,
            roomNumber: true,
            role: true,
            disabledAt: true,
            mcpTokenVersion: true,
            createdAt: true,
          },
        })
      : await prisma.user.update({
          where: { id: userId },
          data: {
            mcpTokenVersion: 1,
            mcpTokenIssuedAt: now,
            mcpGuideSeenAt: now,
          },
          select: {
            id: true,
            username: true,
            roomNumber: true,
            role: true,
            disabledAt: true,
            mcpTokenVersion: true,
            createdAt: true,
          },
        });

  return {
    user: toCommunityUser(ensured),
    token: issueUserMcpToken(ensured),
  };
}

export async function rotateUserMcpToken(userId: string) {
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
          mcpTokenVersion: 0,
          mcpTokenIssuedAt: null,
        },
      }),
    ]);
    throw new Error("USER_DISABLED");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      mcpTokenVersion: { increment: 1 },
      mcpTokenIssuedAt: new Date(),
      mcpGuideSeenAt: new Date(),
    },
    select: {
      id: true,
      username: true,
      roomNumber: true,
      role: true,
      disabledAt: true,
      mcpTokenVersion: true,
      createdAt: true,
    },
  });

  return {
    user: toCommunityUser(user),
    token: issueUserMcpToken(user),
  };
}

export async function verifyUserMcpToken(token: string) {
  const parsed = parseToken(token);
  if (!parsed) {
    return null;
  }

  const expectedSignature = signTokenPayload(parsed.userId, parsed.version);
  if (!signaturesMatch(expectedSignature, parsed.signature)) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: parsed.userId },
    select: {
      id: true,
      username: true,
      roomNumber: true,
      role: true,
      disabledAt: true,
      mcpTokenVersion: true,
      createdAt: true,
    },
  });

  if (!user || isUserDisabled(user) || user.mcpTokenVersion !== parsed.version || user.mcpTokenVersion <= 0) {
    return null;
  }

  return toCommunityUser(user);
}
