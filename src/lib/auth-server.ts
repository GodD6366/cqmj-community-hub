import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { consumeInviteCode } from "./invite";
import { normalizeInviteCode, normalizeRoomNumber, normalizeUsername } from "./access-control";
import type { CommunityUser } from "./types";

export const SESSION_COOKIE = "community_hub_session";
export const SESSION_DAYS = 30;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function toCommunityUser(user: { id: string; username: string; roomNumber?: string | null; createdAt: Date }): CommunityUser {
  return {
    id: user.id,
    username: user.username,
    roomNumber: user.roomNumber ?? "",
    createdAt: user.createdAt.toISOString(),
  };
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MS);
  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });
  return { token, expiresAt };
}

export async function destroySession(token: string) {
  await prisma.session.deleteMany({ where: { token } });
}

export function getSessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
}

export async function getCurrentUserFromCookie() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { token } }).catch(() => undefined);
    return null;
  }

  return toCommunityUser(session.user);
}

export async function registerUser(input: { username: string; password: string; inviteCode: string; roomNumber: string }) {
  const username = normalizeUsername(input.username);
  if (!username) {
    throw new Error("INVALID_USERNAME");
  }

  const roomNumber = normalizeRoomNumber(input.roomNumber);
  if (!roomNumber) {
    throw new Error("INVALID_ROOM_NUMBER");
  }

  const inviteCode = normalizeInviteCode(input.inviteCode);
  if (!inviteCode) {
    throw new Error("INVALID_INVITE_CODE");
  }

  const existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername) {
    throw new Error("USERNAME_EXISTS");
  }

  const existingRoom = await prisma.user.findUnique({ where: { roomNumber } });
  if (existingRoom) {
    throw new Error("ROOM_NUMBER_EXISTS");
  }

  await consumeInviteCode(inviteCode);

  return prisma.user.create({
    data: {
      username,
      name: username,
      roomNumber,
      passwordHash: await hashPassword(input.password),
    },
  });
}

export async function loginUser(input: { username: string; password: string }) {
  const username = normalizeUsername(input.username);
  if (!username) {
    throw new Error("INVALID_USERNAME");
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) {
    throw new Error("INVALID_CREDENTIALS");
  }

  return user;
}
