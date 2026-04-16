import { normalizeText } from "./utils";

export function normalizeUsername(value: string) {
  const username = normalizeText(value);
  return username ? username : null;
}

export function normalizeInviteCode(value: string) {
  const inviteCode = normalizeText(value).toUpperCase();
  return inviteCode ? inviteCode : null;
}

export function normalizeRoomNumber(value: string) {
  const roomNumber = normalizeText(value);
  return /^\d+-\d{3,4}$/.test(roomNumber) ? roomNumber : null;
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
