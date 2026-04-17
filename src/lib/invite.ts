import { Prisma } from "../generated/prisma/client";
import { normalizeInviteCode, normalizeRoomNumber, parseDelimitedCodes } from "./access-control";

const DEFAULT_INVITE_CODES = parseDelimitedCodes(
  process.env.COMMUNITY_INVITE_CODES ?? process.env.NEXT_PUBLIC_COMMUNITY_INVITE_CODES ?? "WELCOME-2026,NEIGHBOR-2026",
);

export { normalizeRoomNumber };

export type InviteValidationResult =
  | { ok: true; normalizedCode: string; remainingUses: number | null; expiresAt: string | null; note: string | null }
  | { ok: false; normalizedCode: string | null; reason: "empty" | "invalid" | "inactive" | "expired" | "exhausted" };

export function parseInviteCodes(value: string) {
  return parseDelimitedCodes(value);
}

export function getDefaultInviteCodes() {
  return DEFAULT_INVITE_CODES;
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
  const normalized = normalizeInviteCode(code);
  if (!normalized) return null;
  return prisma.inviteCode.findUnique({ where: { code: normalized } });
}

export async function validateInviteCode(code: string): Promise<InviteValidationResult> {
  const inviteCode = await getActiveInviteCode(code);
  const normalizedCode = normalizeInviteCode(code);

  if (!normalizedCode) {
    return { ok: false, normalizedCode: null, reason: code.trim() ? "invalid" : "empty" };
  }

  if (!inviteCode) {
    return { ok: false, normalizedCode, reason: "invalid" };
  }

  if (!inviteCode.active) {
    return { ok: false, normalizedCode, reason: "inactive" };
  }

  if (inviteCode.expiresAt && inviteCode.expiresAt.getTime() <= Date.now()) {
    return { ok: false, normalizedCode, reason: "expired" };
  }

  if (inviteCode.maxUses !== null && inviteCode.usedCount >= inviteCode.maxUses) {
    return { ok: false, normalizedCode, reason: "exhausted" };
  }

  return {
    ok: true,
    normalizedCode,
    remainingUses: inviteCode.maxUses === null ? null : Math.max(inviteCode.maxUses - inviteCode.usedCount, 0),
    expiresAt: inviteCode.expiresAt?.toISOString() ?? null,
    note: inviteCode.note,
  };
}

export async function consumeInviteCode(code: string) {
  const { prisma } = await import("./db");
  const normalized = normalizeInviteCode(code);
  if (!normalized) {
    throw new Error("INVALID_INVITE_CODE");
  }

  return prisma.$transaction(
    async (tx) => {
      const inviteCode = await tx.inviteCode.findUnique({ where: { code: normalized } });
      if (!inviteCode || !inviteCode.active) {
        throw new Error("INVALID_INVITE_CODE");
      }

      if (inviteCode.expiresAt && inviteCode.expiresAt.getTime() <= Date.now()) {
        throw new Error("INVITE_CODE_EXPIRED");
      }

      if (inviteCode.maxUses !== null && inviteCode.usedCount >= inviteCode.maxUses) {
        throw new Error("INVITE_CODE_EXHAUSTED");
      }

      return tx.inviteCode.update({
        where: { id: inviteCode.id },
        data: { usedCount: { increment: 1 } },
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}
