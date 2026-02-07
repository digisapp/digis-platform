/**
 * Username Validation Tests
 *
 * Tests username validation, suggestion, and reserved username checking.
 * Pure functions - no DB or network dependencies.
 */

import { describe, it, expect } from 'vitest';
import { validateUsername, suggestUsername, generateUsernameSuggestions } from '@/lib/utils/username';
import { isReservedUsername, getReservedReason, validateUsernameFormat } from '@/lib/reserved-usernames';

describe('validateUsername', () => {
  it('accepts valid usernames', () => {
    expect(validateUsername('john_doe').valid).toBe(true);
    expect(validateUsername('User123').valid).toBe(true);
    expect(validateUsername('abc').valid).toBe(true);
  });

  it('rejects empty username', () => {
    const result = validateUsername('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Username is required');
  });

  it('rejects usernames under 3 chars', () => {
    expect(validateUsername('ab').valid).toBe(false);
    expect(validateUsername('a').valid).toBe(false);
  });

  it('rejects usernames over 20 chars', () => {
    expect(validateUsername('a'.repeat(21)).valid).toBe(false);
  });

  it('rejects special characters', () => {
    expect(validateUsername('user@name').valid).toBe(false);
    expect(validateUsername('user name').valid).toBe(false);
    expect(validateUsername('user.name').valid).toBe(false);
    expect(validateUsername('user-name').valid).toBe(false);
  });

  it('allows underscores', () => {
    expect(validateUsername('user_name').valid).toBe(true);
    expect(validateUsername('_user_').valid).toBe(true);
  });

  it('rejects reserved usernames', () => {
    expect(validateUsername('admin').valid).toBe(false);
    expect(validateUsername('Admin').valid).toBe(false);
    expect(validateUsername('support').valid).toBe(false);
    expect(validateUsername('settings').valid).toBe(false);
    expect(validateUsername('explore').valid).toBe(false);
  });
});

describe('suggestUsername', () => {
  it('cleans and lowercases input', () => {
    expect(suggestUsername('John Doe')).toBe('johndoe');
  });

  it('removes special characters', () => {
    expect(suggestUsername('user@name!')).toBe('username');
  });

  it('truncates to 15 chars', () => {
    expect(suggestUsername('a'.repeat(20)).length).toBeLessThanOrEqual(15);
  });

  it('returns "user" for empty input', () => {
    expect(suggestUsername('')).toBe('user');
  });

  it('returns "user" for all-special-char input', () => {
    expect(suggestUsername('!@#$%')).toBe('user');
  });

  it('preserves underscores', () => {
    expect(suggestUsername('john_doe')).toBe('john_doe');
  });
});

describe('generateUsernameSuggestions', () => {
  it('returns an array of suggestions', () => {
    const suggestions = generateUsernameSuggestions('john');
    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.length).toBeGreaterThanOrEqual(2);
  });

  it('includes the base username', () => {
    const suggestions = generateUsernameSuggestions('testuser');
    expect(suggestions[0]).toBe('testuser');
  });

  it('includes numbered and _official variants', () => {
    const suggestions = generateUsernameSuggestions('testuser');
    expect(suggestions).toContain('testuser1');
    expect(suggestions).toContain('testuser_official');
  });

  it('removes duplicates', () => {
    const suggestions = generateUsernameSuggestions('test');
    const unique = new Set(suggestions);
    expect(suggestions.length).toBe(unique.size);
  });
});

describe('isReservedUsername', () => {
  it('reserves all 4-letter or shorter usernames', () => {
    expect(isReservedUsername('abc')).toBe(true);
    expect(isReservedUsername('abcd')).toBe(true);
    expect(isReservedUsername('a')).toBe(true);
    expect(isReservedUsername('test')).toBe(true);
  });

  it('does not reserve 5+ letter non-listed usernames', () => {
    expect(isReservedUsername('myuniqueusername')).toBe(false);
    expect(isReservedUsername('randomuser12345')).toBe(false);
  });

  it('reserves platform terms', () => {
    expect(isReservedUsername('admin')).toBe(true);
    expect(isReservedUsername('dashboard')).toBe(true);
    expect(isReservedUsername('settings')).toBe(true);
    expect(isReservedUsername('wallet')).toBe(true);
  });

  it('is case insensitive', () => {
    expect(isReservedUsername('Admin')).toBe(true);
    expect(isReservedUsername('ADMIN')).toBe(true);
    expect(isReservedUsername('Dashboard')).toBe(true);
  });

  it('reserves brand names', () => {
    expect(isReservedUsername('google')).toBe(true);
    expect(isReservedUsername('instagram')).toBe(true);
    expect(isReservedUsername('spotify')).toBe(true);
  });

  it('reserves platform name variations', () => {
    expect(isReservedUsername('digis')).toBe(true);
    expect(isReservedUsername('digisapp')).toBe(true);
    expect(isReservedUsername('digisofficial')).toBe(true);
  });
});

describe('getReservedReason', () => {
  it('returns premium reason for short usernames', () => {
    const reason = getReservedReason('abc');
    expect(reason).toContain('Premium');
    expect(reason).toContain('3-letter');
  });

  it('returns VIP reason for listed usernames', () => {
    const reason = getReservedReason('google');
    expect(reason).toContain('Reserved');
    expect(reason).toContain('VIP');
  });

  it('returns null for unreserved usernames', () => {
    expect(getReservedReason('myuniqueusername')).toBeNull();
  });
});

describe('validateUsernameFormat', () => {
  it('accepts valid usernames', () => {
    expect(validateUsernameFormat('john_doe').valid).toBe(true);
    expect(validateUsernameFormat('Alice123').valid).toBe(true);
    expect(validateUsernameFormat('abc').valid).toBe(true);
  });

  it('rejects empty or too-short usernames', () => {
    expect(validateUsernameFormat('').valid).toBe(false);
    expect(validateUsernameFormat('ab').valid).toBe(false);
  });

  it('rejects usernames over 20 chars', () => {
    expect(validateUsernameFormat('a'.repeat(21)).valid).toBe(false);
  });

  it('requires username to start with a letter', () => {
    expect(validateUsernameFormat('1user').valid).toBe(false);
    expect(validateUsernameFormat('_user').valid).toBe(false);
    expect(validateUsernameFormat('9test').valid).toBe(false);
  });

  it('rejects consecutive underscores', () => {
    expect(validateUsernameFormat('user__name').valid).toBe(false);
  });

  it('rejects trailing underscore', () => {
    expect(validateUsernameFormat('username_').valid).toBe(false);
  });

  it('rejects special characters', () => {
    expect(validateUsernameFormat('user@name').valid).toBe(false);
    expect(validateUsernameFormat('user.name').valid).toBe(false);
    expect(validateUsernameFormat('user-name').valid).toBe(false);
  });
});
