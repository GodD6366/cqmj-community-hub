import type { Prisma } from "@/generated/prisma/client";
import { normalizeRoomNumber, normalizeUsername } from "./access-control";
import { prisma } from "./db";
import type { AdminUser } from "./types";

const adminUserSelect = {
  id: true,
  username: true,
  roomNumber: true,
  role: true,
  disabledAt: true,
  createdAt: true,
  _count: {
    select: {
      posts: true,
      comments: true,
    },
  },
} satisfies Prisma.UserSelect;

type AdminUserRecord = Prisma.UserGetPayload<{ select: typeof adminUserSelect }>;

function mapAdminUser(user: AdminUserRecord): AdminUser {
  return {
    id: user.id,
    username: user.username,
    roomNumber: user.roomNumber ?? "",
    role: user.role,
    disabled: Boolean(user.disabledAt),
    createdAt: user.createdAt.toISOString(),
    postCount: user._count.posts,
    commentCount: user._count.comments,
  };
}

function compareAdminUsers(a: AdminUser, b: AdminUser) {
  const roomA = a.roomNumber || "\uffff";
  const roomB = b.roomNumber || "\uffff";
  const byRoom = roomA.localeCompare(roomB, "zh-CN");
  if (byRoom !== 0) {
    return byRoom;
  }

  return Date.parse(b.createdAt) - Date.parse(a.createdAt);
}

function isReadOnlyAdmin(user: { role: "user" | "admin" }) {
  return user.role === "admin";
}

async function clearUserAccess(tx: Prisma.TransactionClient, userId: string) {
  await tx.session.deleteMany({ where: { userId } });
}

async function findUsernameConflict(tx: Prisma.TransactionClient, userId: string, username: string) {
  const existing = await tx.user.findUnique({ where: { username } });
  return existing && existing.id !== userId ? existing : null;
}

export async function listAdminUsers() {
  const users = await prisma.user.findMany({
    select: adminUserSelect,
  });

  return users.map(mapAdminUser).sort(compareAdminUsers);
}

export async function updateAdminUser(
  userId: string,
  input: {
    username?: string;
    roomNumber?: string;
    disabled?: boolean;
  },
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        roomNumber: true,
        role: true,
        disabledAt: true,
      },
    });

    if (!current) {
      throw new Error("USER_NOT_FOUND");
    }

    if (isReadOnlyAdmin(current)) {
      throw new Error("ADMIN_USER_READ_ONLY");
    }

    const data: Prisma.UserUpdateInput = {};

    if (input.username !== undefined) {
      const username = normalizeUsername(input.username);
      if (!username) {
        throw new Error("INVALID_USERNAME");
      }
      if (username !== current.username && (await findUsernameConflict(tx, userId, username))) {
        throw new Error("USERNAME_EXISTS");
      }
      data.username = username;
      data.name = username;
    }

    if (input.roomNumber !== undefined) {
      const roomNumber = normalizeRoomNumber(input.roomNumber);
      if (!roomNumber) {
        throw new Error("INVALID_ROOM_NUMBER");
      }
      data.roomNumber = roomNumber;
    }

    if (input.disabled !== undefined) {
      if (input.disabled && !current.disabledAt) {
        data.disabledAt = new Date();
        data.mcpTokenVersion = 0;
        data.mcpTokenIssuedAt = null;
        await clearUserAccess(tx, userId);
      }

      if (!input.disabled && current.disabledAt) {
        data.disabledAt = null;
      }
    }

    const updated = await tx.user.update({
      where: { id: userId },
      data,
      select: adminUserSelect,
    });

    return mapAdminUser(updated);
  });
}

export async function deleteAdminUser(userId: string) {
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
    },
  });

  if (!current) {
    return false;
  }

  if (isReadOnlyAdmin(current)) {
    throw new Error("ADMIN_USER_READ_ONLY");
  }

  await prisma.user.delete({ where: { id: userId } });
  return true;
}
