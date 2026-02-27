/**
 * VOD Purchase API Route Tests
 *
 * Tests: POST /api/vods/[vodId]/purchase
 * Covers: auth, ownership, free VOD rejection, wallet debit/credit,
 * refund on failure, idempotency key generation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

const mockFindFirstVod = vi.fn();
vi.mock('@/lib/data/system', () => ({
  db: {
    query: {
      vods: { findFirst: (...args: any[]) => mockFindFirstVod(...args) },
    },
  },
  vods: { id: 'id' },
}));

const mockCreateTransaction = vi.fn();
const mockGetBalance = vi.fn();
vi.mock('@/lib/wallet/wallet-service', () => ({
  WalletService: {
    createTransaction: (...args: any[]) => mockCreateTransaction(...args),
    getBalance: (...args: any[]) => mockGetBalance(...args),
  },
}));

const mockPurchaseVODAccess = vi.fn();
vi.mock('@/lib/vods/vod-access', () => ({
  purchaseVODAccess: (...args: any[]) => mockPurchaseVODAccess(...args),
}));

vi.mock('uuid', () => ({ v4: () => 'test-uuid-1234' }));

// ─── Import route handler ──────────────────────────────────────────────────────

import { POST } from '@/app/api/vods/[vodId]/purchase/route';
import { NextRequest } from 'next/server';

function makeRequest(vodId: string) {
  const req = new NextRequest('http://localhost/api/vods/' + vodId + '/purchase', {
    method: 'POST',
  });
  return { req, params: Promise.resolve({ vodId }) };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/vods/[vodId]/purchase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } });

    const { req, params } = makeRequest('vod-1');
    const res = await POST(req, { params });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Authentication required');
  });

  it('returns 404 when VOD does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFindFirstVod.mockResolvedValue(null);

    const { req, params } = makeRequest('nonexistent');
    const res = await POST(req, { params });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('VOD not found');
  });

  it('returns 400 when purchasing own VOD', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'creator-1' } }, error: null });
    mockFindFirstVod.mockResolvedValue({
      id: 'vod-1',
      creatorId: 'creator-1',
      title: 'My Stream',
      isPublic: false,
      priceCoins: 100,
      creator: { id: 'creator-1', username: 'me', displayName: 'Me' },
    });

    const { req, params } = makeRequest('vod-1');
    const res = await POST(req, { params });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('You cannot purchase your own VOD');
  });

  it('returns 400 when VOD is free/public', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFindFirstVod.mockResolvedValue({
      id: 'vod-1',
      creatorId: 'creator-1',
      title: 'Free Stream',
      isPublic: true,
      priceCoins: 0,
      creator: { id: 'creator-1', username: 'creator', displayName: 'Creator' },
    });

    const { req, params } = makeRequest('vod-1');
    const res = await POST(req, { params });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('This VOD is free to watch');
  });

  it('returns 400 when wallet has insufficient balance', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFindFirstVod.mockResolvedValue({
      id: 'vod-1',
      creatorId: 'creator-1',
      title: 'Premium Stream',
      isPublic: false,
      priceCoins: 500,
      creator: { id: 'creator-1', username: 'creator', displayName: 'Creator' },
    });
    mockCreateTransaction.mockRejectedValue(new Error('Insufficient balance'));

    const { req, params } = makeRequest('vod-1');
    const res = await POST(req, { params });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Insufficient balance');
  });

  it('completes purchase: debit buyer, record purchase, credit creator', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFindFirstVod.mockResolvedValue({
      id: 'vod-1',
      creatorId: 'creator-1',
      title: 'Premium Stream',
      isPublic: false,
      priceCoins: 200,
      creator: { id: 'creator-1', username: 'creator', displayName: 'Creator' },
    });
    mockCreateTransaction.mockResolvedValue({ id: 'tx-1' });
    mockPurchaseVODAccess.mockResolvedValue({ success: true });
    mockGetBalance.mockResolvedValue(800);

    const { req, params } = makeRequest('vod-1');
    const res = await POST(req, { params });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.newBalance).toBe(800);

    // Verify debit from buyer
    expect(mockCreateTransaction).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      amount: -200,
      type: 'ppv_unlock',
    }));

    // Verify credit to creator
    expect(mockCreateTransaction).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'creator-1',
      amount: 200,
      type: 'creator_payout',
    }));

    // Verify purchase was recorded
    expect(mockPurchaseVODAccess).toHaveBeenCalledWith({ vodId: 'vod-1', userId: 'user-1' });
  });

  it('refunds buyer if purchase recording fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFindFirstVod.mockResolvedValue({
      id: 'vod-1',
      creatorId: 'creator-1',
      title: 'Premium Stream',
      isPublic: false,
      priceCoins: 200,
      creator: { id: 'creator-1', username: 'creator', displayName: 'Creator' },
    });
    mockCreateTransaction.mockResolvedValue({ id: 'tx-1' });
    mockPurchaseVODAccess.mockResolvedValue({ success: false, error: 'DB write failed' });

    const { req, params } = makeRequest('vod-1');
    const res = await POST(req, { params });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('DB write failed');

    // Verify refund was issued
    expect(mockCreateTransaction).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      amount: 200,
      type: 'refund',
    }));
  });

  it('generates unique idempotency keys per purchase', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFindFirstVod.mockResolvedValue({
      id: 'vod-1',
      creatorId: 'creator-1',
      title: 'Premium',
      isPublic: false,
      priceCoins: 100,
      creator: { id: 'creator-1', username: 'c', displayName: 'C' },
    });
    mockCreateTransaction.mockResolvedValue({ id: 'tx-1' });
    mockPurchaseVODAccess.mockResolvedValue({ success: true });
    mockGetBalance.mockResolvedValue(900);

    const { req, params } = makeRequest('vod-1');
    await POST(req, { params });

    // Debit call should have idempotency key with vodId and userId
    const debitCall = mockCreateTransaction.mock.calls[0][0];
    expect(debitCall.idempotencyKey).toContain('vod_purchase_vod-1_user-1');

    // Credit call should have idempotency key
    const creditCall = mockCreateTransaction.mock.calls[1][0];
    expect(creditCall.idempotencyKey).toContain('vod_sale_vod-1_user-1');
  });
});
