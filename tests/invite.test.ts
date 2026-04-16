import { describe, expect, it } from 'vitest';
import { normalizeRoomNumber, parseInviteCodes, isInviteCodeAllowed } from '../src/lib/invite';

describe('invite login helpers', () => {
  it('normalizes room numbers like 1-905', () => {
    expect(normalizeRoomNumber(' 1-905 ')).toBe('1-905');
    expect(normalizeRoomNumber('1-0905')).toBe('1-0905');
  });

  it('rejects malformed room numbers', () => {
    expect(normalizeRoomNumber('905')).toBeNull();
    expect(normalizeRoomNumber('1-90')).toBeNull();
    expect(normalizeRoomNumber('A-905')).toBeNull();
  });

  it('parses invite codes from env strings', () => {
    expect(parseInviteCodes('alpha, beta\nGamma')).toEqual(['ALPHA', 'BETA', 'GAMMA']);
  });

  it('allows invite code matching regardless of case and whitespace', () => {
    expect(isInviteCodeAllowed('  alpha  ', ['ALPHA', 'BETA'])).toBe(true);
    expect(isInviteCodeAllowed('omega', ['ALPHA', 'BETA'])).toBe(false);
  });
});
