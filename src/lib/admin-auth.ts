import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "community_hub_admin_session";
const ADMIN_SESSION_DAYS = 7;
const ADMIN_SESSION_MS = ADMIN_SESSION_DAYS * 24 * 60 * 60 * 1000;

function getAdminPassword() {
  return (process.env.COMMUNITY_ADMIN_PASSWORD ?? "admin").trim();
}

function signToken(token: string) {
  const secret = getAdminPassword();
  return createHmac("sha256", secret).update(token).digest("hex");
}

export function verifyAdminPassword(password: string) {
  const secret = getAdminPassword();
  if (!secret) {
    return false;
  }
  return password === secret;
}

export function createAdminSessionToken() {
  const token = randomBytes(32).toString("hex");
  return `${token}.${signToken(token)}`;
}

export function verifyAdminSessionToken(value: string) {
  const [token, signature] = value.split(".");
  if (!token || !signature) {
    return false;
  }
  const expected = signToken(token);
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function getAdminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(Date.now() + ADMIN_SESSION_MS),
  };
}

export async function getCurrentAdminFromCookie() {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!token || !verifyAdminSessionToken(token)) {
    return null;
  }
  return { authenticated: true as const };
}
