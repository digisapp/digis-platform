/**
 * Wallet Balance API Route Tests
 *
 * Tests: GET /api/wallet/balance
 * Covers: auth, balance retrieval, DB timeout fallback, held balance calculation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

const mockFindFirstWallet = vi.fn();
vi.mock('@/lib/data/system', () => ({
  db: {
    query: {
      wallets: { findFirst: (...args: any[]) => mockFindFirstWallet(...args) },
    },
  },
}));

vi.mock('@/db/schema', () => ({
  wallets: { userId: 'user_id' },
}));

const mockRateLimit = vi.fn();
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: (...args: any[]) => mockRateLimit(...args),
}));

// ─── Import route handler ──────────────────────────────────────────────────────

import { GET } from '@/app/api/wallet/balance/route';
import { NextRequest } from 'next/server';

function makeRequest() {
  return new NextRequest('http://localhost/api/wallet/balance', { method: 'GET' });
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/wallet/balance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockResolvedValue({ ok: true, headers: {} });
  });

  it('returns 429 when rate limited', async () => {
    mockRateLimit.mockResolvedValue({ ok: false, headers: { 'Retry-After': '60' } });

    const req = makeRequest();
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toContain('Too many requests');
  });

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } });

    const req = makeRequest();
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns balance with available calculation', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFindFirstWallet.mockResolvedValue({ balance: 1000, heldBalance: 200 });

    const req = makeRequest();
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.balance).toBe(1000);
    expect(body.heldBalance).toBe(200);
    expect(body.availableBalance).toBe(800); // 1000 - 200
  });

  it('returns zero balance when wallet does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFindFirstWallet.mockResolvedValue(null);

    const req = makeRequest();
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.balance).toBe(0);
    expect(body.availableBalance).toBe(0);
    expect(body.heldBalance).toBe(0);
  });

  it('returns zero balance on DB timeout (graceful degradation)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFindFirstWallet.mockImplementation(() =>
      new Promise((_, reject) => setTimeout(() => reject(new Error('Wallet query timeout')), 10))
    );

    const req = makeRequest();
    const res = await GET(req);
    const body = await res.json();

    // Should return 200 with zero balance, not crash
    expect(res.status).toBe(200);
    expect(body.balance).toBe(0);
    expect(body.availableBalance).toBe(0);
  });

  it('returns zero balance on unexpected error (never crashes)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFindFirstWallet.mockRejectedValue(new Error('Connection refused'));

    const req = makeRequest();
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.balance).toBe(0);
  });
});
