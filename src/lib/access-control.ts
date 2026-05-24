import { normalizeText } from "./utils";

export function normalizeUsername(value: string) {
  const username = normalizeText(value);
  return username ? username : null;
}

export function normalizeNickname(value: string) {
  const nickname = normalizeText(value);
  return nickname ? nickname : null;
}

export function normalizeInviteCode(value: string) {
  const inviteCode = normalizeText(value).toUpperCase();
  return inviteCode ? inviteCode : null;
}

export function normalizeRoomNumber(value: string) {
  const roomNumber = normalizeText(value);
  return /^\d+-\d{3,4}$/.test(roomNumber) ? roomNumber : null;
}

export function getBuildingFromRoomNumber(value: string | null | undefined) {
  const roomNumber = typeof value === "string" ? normalizeRoomNumber(value) : null;
  if (!roomNumber) {
    return null;
  }

  const [building] = roomNumber.split("-", 1);
  return building || null;
}

export function parseDelimitedCodes(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[，,\n]/)
        .map((item) => normalizeInviteCode(item))
        .filter((item): item is string => Boolean(item)),
    ),
  );
}
