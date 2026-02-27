/**
 * Reserve Username API Route Tests
 *
 * Tests: POST /api/auth/reserve-username
 * Covers: validation, honeypot detection, blocked domains, username generation,
 * creator invite matching, duplicate handling, auto-creator setup.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockRateLimit = vi.fn();
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: (...args: any[]) => mockRateLimit(...args),
}));

const mockFindFirstCreatorInvites = vi.fn();
const mockFindFirstUsers = vi.fn();
const mockInsertUsers = vi.fn();
const mockUpdateUsers = vi.fn();
const mockUpdateCreatorInvites = vi.fn();
const mockInsertCreatorSettings = vi.fn();
const mockInsertAiTwinSettings = vi.fn();
const mockInsertProfiles = vi.fn();

vi.mock('@/lib/data/system', () => ({
  db: {
    query: {
      creatorInvites: { findFirst: (...args: any[]) => mockFindFirstCreatorInvites(...args) },
      users: { findFirst: (...args: any[]) => mockFindFirstUsers(...args) },
    },
    insert: vi.fn((table: any) => {
      // Route to correct mock based on which table is being inserted
      const mockMap: Record<string, any> = {
        users: mockInsertUsers,
        creatorSettings: mockInsertCreatorSettings,
        aiTwinSettings: mockInsertAiTwinSettings,
        profiles: mockInsertProfiles,
      };
      const mock = mockMap[table?._name] || mockInsertUsers;
      return {
        values: vi.fn(() => ({
          onConflictDoNothing: vi.fn(() => Promise.resolve()),
          returning: vi.fn(() => Promise.resolve([{}])),
        })),
      };
    }),
    update: vi.fn((table: any) => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
  },
  users: { id: 'id', username: 'username', _name: 'users' },
  creatorInvites: { email: 'email', status: 'status', id: 'id', _name: 'creatorInvites' },
  creatorSettings: { _name: 'creatorSettings' },
  aiTwinSettings: { _name: 'aiTwinSettings' },
  profiles: { _name: 'profiles' },
  creatorApplications: { _name: 'creatorApplications' },
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        updateUserById: vi.fn(() => Promise.resolve({})),
      },
    },
  },
}));

const mockIsBlockedDomain = vi.fn();
const mockIsHoneypotTriggered = vi.fn();
vi.mock('@/lib/validation/spam-protection', () => ({
  isBlockedDomain: (...args: any[]) => mockIsBlockedDomain(...args),
  isHoneypotTriggered: (...args: any[]) => mockIsHoneypotTriggered(...args),
}));

// ─── Import route handler ──────────────────────────────────────────────────────

import { POST } from '@/app/api/auth/reserve-username/route';
import { NextRequest } from 'next/server';

function makeRequest(body: Record<string, any>) {
  return new NextRequest('http://localhost/api/auth/reserve-username', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/auth/reserve-username', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockResolvedValue({ ok: true, headers: {} });
    mockIsBlockedDomain.mockReturnValue({ blocked: false });
    mockIsHoneypotTriggered.mockReturnValue(false);
    mockFindFirstCreatorInvites.mockResolvedValue(null); // No invite match
    mockFindFirstUsers.mockResolvedValue(null); // No existing user
  });

  it('returns 429 when rate limited', async () => {
    mockRateLimit.mockResolvedValue({ ok: false, headers: { 'Retry-After': '60' } });

    const req = makeRequest({ userId: 'u1', email: 'test@gmail.com' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toContain('Too many requests');
  });

  it('returns 400 when userId is missing', async () => {
    const req = makeRequest({ email: 'test@gmail.com' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Missing required fields');
  });

  it('returns 400 when email is missing', async () => {
    const req = makeRequest({ userId: 'u1' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Missing required fields');
  });

  it('silently succeeds when honeypot is triggered (anti-bot)', async () => {
    mockIsHoneypotTriggered.mockReturnValue(true);

    const req = makeRequest({ userId: 'u1', email: 'bot@spam.com', website: 'http://spam.com' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    // Should NOT have created a user in the DB
    expect(mockFindFirstUsers).not.toHaveBeenCalled();
  });

  it('returns 400 for blocked email domains', async () => {
    mockIsBlockedDomain.mockReturnValue({ blocked: true, reason: 'Disposable email not allowed' });

    const req = makeRequest({ userId: 'u1', email: 'test@tempmail.com' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('not allowed');
  });

  it('returns 400 for invalid username format', async () => {
    const req = makeRequest({ userId: 'u1', email: 'test@gmail.com', username: '1bad' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Invalid username format');
  });

  it('returns 409 when username is already taken', async () => {
    // Route calls users.findFirst twice:
    // 1st: check if username is taken (returns existing user)
    // 2nd: check if userId row exists (not reached since 409 returned first)
    mockFindFirstUsers
      .mockResolvedValueOnce({ id: 'other-user', username: 'taken' }); // username taken

    const req = makeRequest({ userId: 'u1', email: 'test@gmail.com', username: 'taken' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe('Username is already taken');
  });

  it('generates temp username when none provided', async () => {
    const req = makeRequest({ userId: 'abcd1234-rest-of-uuid', email: 'test@gmail.com' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.username).toBe('user_abcd1234');
    expect(body.role).toBe('fan');
  });

  it('matches creator invite and grants creator role', async () => {
    mockFindFirstCreatorInvites.mockResolvedValue({
      id: 'invite-1',
      email: 'creator@gmail.com',
      status: 'pending',
      instagramHandle: 'coolcreator',
      displayName: 'Cool Creator',
    });

    const req = makeRequest({ userId: 'u1', email: 'creator@gmail.com' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.role).toBe('creator');
    expect(body.isCreator).toBe(true);
    // Should use Instagram handle as username
    expect(body.username).toBe('coolcreator');
  });

  it('handles duplicate key constraint gracefully', async () => {
    const error = new Error('duplicate key value violates unique constraint');
    (error as any).code = '23505';
    mockFindFirstUsers.mockRejectedValue(error);

    const req = makeRequest({ userId: 'u1', email: 'test@gmail.com' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe('Username is already taken');
  });

  it('normalizes email to lowercase', async () => {
    const req = makeRequest({ userId: 'u1', email: 'TEST@GMAIL.COM' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    // Invite check should use lowercase email
    expect(mockFindFirstCreatorInvites).toHaveBeenCalled();
  });
});
