import { normalizeInviteCode, normalizeRoomNumber, parseDelimitedCodes } from "./access-control";

const DEFAULT_INVITE_CODES = parseDelimitedCodes(
  process.env.COMMUNITY_INVITE_CODES ?? process.env.NEXT_PUBLIC_COMMUNITY_INVITE_CODES ?? "WELCOME-2026,NEIGHBOR-2026",
);

export { normalizeRoomNumber };

async function ensureDefaultInviteCodes() {
  const { prisma } = await import("./db");
  const count = await prisma.inviteCode.count();
  if (count > 0) {
    return;
  }

  if (DEFAULT_INVITE_CODES.length === 0) {
    return;
  }

  await prisma.inviteCode.createMany({
    data: DEFAULT_INVITE_CODES.map((code) => ({
      code,
      note: "默认邀请码",
      active: true,
      usedCount: 0,
    })),
  });
}

export function parseInviteCodes(value: string) {
  return parseDelimitedCodes(value);
}

export function isInviteCodeAllowed(value: string, allowedCodes: readonly string[]) {
  const inviteCode = normalizeInviteCode(value);
  if (!inviteCode) {
    return false;
  }
  return allowedCodes.map((code) => code.toUpperCase()).includes(inviteCode);
}

export async function listInviteCodes() {
  const { prisma } = await import("./db");
  await ensureDefaultInviteCodes();
  return prisma.inviteCode.findMany({ orderBy: [{ active: "desc" }, { createdAt: "desc" }] });
}

export async function createInviteCode(input: {
  code: string;
  note?: string;
  maxUses?: number | null;
  expiresAt?: Date | null;
}) {
  const { prisma } = await import("./db");
  const code = normalizeInviteCode(input.code);
  if (!code) {
    throw new Error("INVALID_INVITE_CODE");
  }

  return prisma.inviteCode.create({
    data: {
      code,
      note: input.note?.trim() || null,
      maxUses: input.maxUses ?? null,
      expiresAt: input.expiresAt ?? null,
      active: true,
      usedCount: 0,
    },
  });
}

export async function updateInviteCode(
  id: string,
  input: { code?: string; note?: string | null; maxUses?: number | null; expiresAt?: Date | null; active?: boolean },
) {
  const { prisma } = await import("./db");
  const data: {
    code?: string;
    note?: string | null;
    maxUses?: number | null;
    expiresAt?: Date | null;
    active?: boolean;
  } = {};

  if (typeof input.code === "string") {
    const code = normalizeInviteCode(input.code);
    if (!code) {
      throw new Error("INVALID_INVITE_CODE");
    }
    data.code = code;
  }
  if (input.note !== undefined) data.note = input.note?.trim() || null;
  if (input.maxUses !== undefined) data.maxUses = input.maxUses;
  if (input.expiresAt !== undefined) data.expiresAt = input.expiresAt;
  if (input.active !== undefined) data.active = input.active;

  return prisma.inviteCode.update({ where: { id }, data });
}

export async function deleteInviteCode(id: string) {
  const { prisma } = await import("./db");
  return prisma.inviteCode.delete({ where: { id } });
}

export async function getActiveInviteCode(code: string) {
  const { prisma } = await import("./db");
  await ensureDefaultInviteCodes();
  const normalized = normalizeInviteCode(code);
  if (!normalized) return null;
  return prisma.inviteCode.findUnique({ where: { code: normalized } });
}

export async function consumeInviteCode(code: string) {
  const { prisma } = await import("./db");
  const inviteCode = await getActiveInviteCode(code);
  if (!inviteCode || !inviteCode.active) {
    throw new Error("INVALID_INVITE_CODE");
  }

  if (inviteCode.expiresAt && inviteCode.expiresAt.getTime() <= Date.now()) {
    throw new Error("INVITE_CODE_EXPIRED");
  }

  if (inviteCode.maxUses !== null && inviteCode.usedCount >= inviteCode.maxUses) {
    throw new Error("INVITE_CODE_EXHAUSTED");
  }

  return prisma.inviteCode.update({
    where: { id: inviteCode.id },
    data: { usedCount: { increment: 1 } },
  });
}
