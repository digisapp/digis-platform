/**
 * Admin Gate Tests
 *
 * Tests the admin authorization utilities:
 * 1. isAdminFromClaims - single predicate for admin check
 * 2. requireAdminOrThrow - throws on non-admin
 * 3. AuthzError - proper error codes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Supabase server client
const mockGetUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: () => mockGetUser(),
    },
  })),
}));

// Mock next/navigation (for redirect)
vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

import { isAdminFromClaims, AuthzError } from '@/lib/auth/admin';

describe('isAdminFromClaims', () => {
  it('returns true when appMeta.isAdmin is true', () => {
    expect(isAdminFromClaims({ isAdmin: true })).toBe(true);
  });

  it('returns false when appMeta.isAdmin is false', () => {
    expect(isAdminFromClaims({ isAdmin: false })).toBe(false);
  });

  it('returns false when appMeta.isAdmin is undefined', () => {
    expect(isAdminFromClaims({})).toBe(false);
  });

  it('returns false when appMeta is null', () => {
    expect(isAdminFromClaims(null)).toBe(false);
  });

  it('returns false when appMeta is undefined', () => {
    expect(isAdminFromClaims(undefined)).toBe(false);
  });

  it('does NOT check role === "admin" (legacy pattern)', () => {
    // This is the critical test - we must NOT check role
    expect(isAdminFromClaims({ role: 'admin' })).toBe(false);
    expect(isAdminFromClaims({ role: 'admin', isAdmin: false })).toBe(false);
  });

  it('returns true when both isAdmin and role are set', () => {
    // isAdmin takes precedence (and is the only thing checked)
    expect(isAdminFromClaims({ role: 'admin', isAdmin: true })).toBe(true);
    expect(isAdminFromClaims({ role: 'fan', isAdmin: true })).toBe(true);
  });

  it('handles string "true" as falsy (must be boolean)', () => {
    // Type safety - string "true" should NOT grant admin
    expect(isAdminFromClaims({ isAdmin: 'true' as unknown as boolean })).toBe(false);
  });

  it('handles number 1 as falsy (must be boolean true)', () => {
    expect(isAdminFromClaims({ isAdmin: 1 as unknown as boolean })).toBe(false);
  });
});

describe('AuthzError', () => {
  it('creates error with default 403 status', () => {
    const error = new AuthzError('Forbidden');
    expect(error.message).toBe('Forbidden');
    expect(error.status).toBe(403);
    expect(error.name).toBe('AuthzError');
  });

  it('creates error with custom status', () => {
    const error = new AuthzError('Unauthorized', 401);
    expect(error.message).toBe('Unauthorized');
    expect(error.status).toBe(401);
  });

  it('is instanceof Error', () => {
    const error = new AuthzError('Test');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('requireAdminOrThrow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws 401 AuthzError when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { requireAdminOrThrow } = await import('@/lib/auth/admin');

    await expect(requireAdminOrThrow()).rejects.toThrow(AuthzError);

    try {
      await requireAdminOrThrow();
    } catch (err) {
      expect(err).toBeInstanceOf(AuthzError);
      expect((err as AuthzError).status).toBe(401);
      expect((err as AuthzError).message).toBe('Unauthorized');
    }
  });

  it('throws 403 AuthzError when user is authenticated but not admin', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'user@example.com',
          app_metadata: { isAdmin: false },
        },
      },
      error: null,
    });

    const { requireAdminOrThrow } = await import('@/lib/auth/admin');

    await expect(requireAdminOrThrow()).rejects.toThrow(AuthzError);

    try {
      await requireAdminOrThrow();
    } catch (err) {
      expect(err).toBeInstanceOf(AuthzError);
      expect((err as AuthzError).status).toBe(403);
      expect((err as AuthzError).message).toBe('Forbidden - Admin access required');
    }
  });

  it('throws 403 when user has legacy role=admin but not isAdmin flag', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'legacy@example.com',
          app_metadata: { role: 'admin' }, // Legacy pattern - should NOT grant access
        },
      },
      error: null,
    });

    const { requireAdminOrThrow } = await import('@/lib/auth/admin');

    await expect(requireAdminOrThrow()).rejects.toThrow(AuthzError);

    try {
      await requireAdminOrThrow();
    } catch (err) {
      expect((err as AuthzError).status).toBe(403);
    }
  });

  it('returns user and appMeta when user is admin', async () => {
    const mockUser = {
      id: 'admin-1',
      email: 'admin@example.com',
      app_metadata: { isAdmin: true },
    };

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { requireAdminOrThrow } = await import('@/lib/auth/admin');

    const result = await requireAdminOrThrow();

    expect(result.user).toEqual(mockUser);
    expect(result.appMeta).toEqual({ isAdmin: true });
  });

  it('throws 401 when getUser returns an error', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Session expired'),
    });

    const { requireAdminOrThrow } = await import('@/lib/auth/admin');

    await expect(requireAdminOrThrow()).rejects.toThrow(AuthzError);

    try {
      await requireAdminOrThrow();
    } catch (err) {
      expect((err as AuthzError).status).toBe(401);
    }
  });
});

describe('requireAdminOrRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /login when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { requireAdminOrRedirect } = await import('@/lib/auth/admin');

    await expect(requireAdminOrRedirect()).rejects.toThrow('REDIRECT:/login');
  });

  it('redirects to / when user is not admin', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          app_metadata: { isAdmin: false },
        },
      },
      error: null,
    });

    const { requireAdminOrRedirect } = await import('@/lib/auth/admin');

    await expect(requireAdminOrRedirect()).rejects.toThrow('REDIRECT:/');
  });

  it('uses custom redirect paths when provided', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { requireAdminOrRedirect } = await import('@/lib/auth/admin');

    await expect(
      requireAdminOrRedirect({
        notAuthenticatedRedirect: '/auth/signin',
      })
    ).rejects.toThrow('REDIRECT:/auth/signin');
  });

  it('returns user when admin', async () => {
    const mockUser = {
      id: 'admin-1',
      app_metadata: { isAdmin: true },
    };

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { requireAdminOrRedirect } = await import('@/lib/auth/admin');

    const result = await requireAdminOrRedirect();

    expect(result.user).toEqual(mockUser);
  });
});

describe('checkAdminStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns isAdmin: false for non-admin user', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          app_metadata: { role: 'fan' },
        },
      },
      error: null,
    });

    const { checkAdminStatus } = await import('@/lib/auth/admin');

    const result = await checkAdminStatus();

    expect(result.isAuthenticated).toBe(true);
    expect(result.isAdmin).toBe(false);
    expect(result.user).toBeDefined();
  });

  it('returns isAdmin: true for admin user', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'admin-1',
          app_metadata: { isAdmin: true },
        },
      },
      error: null,
    });

    const { checkAdminStatus } = await import('@/lib/auth/admin');

    const result = await checkAdminStatus();

    expect(result.isAuthenticated).toBe(true);
    expect(result.isAdmin).toBe(true);
  });

  it('returns isAuthenticated: false when no user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { checkAdminStatus } = await import('@/lib/auth/admin');

    const result = await checkAdminStatus();

    expect(result.isAuthenticated).toBe(false);
    expect(result.isAdmin).toBe(false);
    expect(result.user).toBeNull();
  });
});
