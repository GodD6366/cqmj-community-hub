import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { normalizeUsername } from "./access-control";

const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "cqmjadmin";

let adminBootstrapPromise: Promise<void> | null = null;

export function getConfiguredAdminUsername() {
  return normalizeUsername(process.env.COMMUNITY_ADMIN_USERNAME ?? DEFAULT_ADMIN_USERNAME) ?? DEFAULT_ADMIN_USERNAME;
}

export function getConfiguredAdminPassword() {
  const value = (process.env.COMMUNITY_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD).trim();
  return value || DEFAULT_ADMIN_PASSWORD;
}

async function syncAdminUser() {
  const username = getConfiguredAdminUsername();
  const existing = await prisma.user.findUnique({
    where: { username },
    select: { id: true, role: true },
  });

  if (!existing) {
    await prisma.user.create({
      data: {
        username,
        name: username,
        roomNumber: null,
        passwordHash: await bcrypt.hash(getConfiguredAdminPassword(), 10),
        role: "admin",
      },
    });
    return;
  }

  if (existing.role !== "admin") {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: "admin" },
    });
  }
}

export async function ensureAdminUserInitialized() {
  if (!adminBootstrapPromise) {
    adminBootstrapPromise = syncAdminUser().catch((error) => {
      adminBootstrapPromise = null;
      throw error;
    });
  }

  return adminBootstrapPromise;
}

export function resetAdminBootstrapForTests() {
  adminBootstrapPromise = null;
}
