import { describe, expect, it } from 'vitest';
import { normalizeInviteCode, normalizeRoomNumber, normalizeUsername } from '../src/lib/access-control';

describe('access control helpers', () => {
  it('normalizes usernames by trimming whitespace', () => {
    expect(normalizeUsername('  Alice  ')).toBe('Alice');
    expect(normalizeUsername('   ')).toBeNull();
  });

  it('normalizes invite codes to uppercase tokens', () => {
    expect(normalizeInviteCode('  ab-12 ')).toBe('AB-12');
  });

  it('validates room numbers in building-room format', () => {
    expect(normalizeRoomNumber('1-905')).toBe('1-905');
    expect(normalizeRoomNumber('905')).toBeNull();
  });
});
