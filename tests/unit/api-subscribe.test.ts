/**
 * Subscription API Route Tests
 *
 * Tests: POST /api/subscriptions/subscribe
 * Covers: auth, self-subscribe rejection, auto-tier creation,
 * insufficient balance parsing, already subscribed, rate limiting.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

const mockGetCreatorTiers = vi.fn();
const mockUpsertSubscriptionTier = vi.fn();
const mockSubscribe = vi.fn();
vi.mock('@/lib/services/subscription-service', () => ({
  SubscriptionService: {
    getCreatorTiers: (...args: any[]) => mockGetCreatorTiers(...args),
    upsertSubscriptionTier: (...args: any[]) => mockUpsertSubscriptionTier(...args),
    subscribe: (...args: any[]) => mockSubscribe(...args),
  },
}));

const mockRateLimitFinancial = vi.fn();
vi.mock('@/lib/rate-limit', () => ({
  rateLimitFinancial: (...args: any[]) => mockRateLimitFinancial(...args),
}));

// ─── Import route handler ──────────────────────────────────────────────────────

import { POST } from '@/app/api/subscriptions/subscribe/route';
import { NextRequest } from 'next/server';

function makeRequest(body: Record<string, any>) {
  return new NextRequest('http://localhost/api/subscriptions/subscribe', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/subscriptions/subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimitFinancial.mockResolvedValue({ ok: true });
  });

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } });

    const req = makeRequest({ creatorId: 'creator-1' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 429 when rate limited', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockRateLimitFinancial.mockResolvedValue({ ok: false, error: 'Rate limited', retryAfter: 30 });

    const req = makeRequest({ creatorId: 'creator-1' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toBe('Rate limited');
    expect(res.headers.get('Retry-After')).toBe('30');
  });

  it('returns 400 when creatorId is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    const req = makeRequest({});
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Creator ID is required');
  });

  it('returns 400 when subscribing to yourself', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    const req = makeRequest({ creatorId: 'user-1' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Cannot subscribe to yourself');
  });

  it('auto-creates default tier if creator has none', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockGetCreatorTiers.mockResolvedValue([]); // No tiers
    mockUpsertSubscriptionTier.mockResolvedValue({
      id: 'tier-default',
      name: 'Subscriber',
      pricePerMonth: 50,
    });
    mockSubscribe.mockResolvedValue({
      id: 'sub-1',
      status: 'active',
      expiresAt: new Date(),
    });

    const req = makeRequest({ creatorId: 'creator-1' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);

    // Verify default tier was created with 50 coins
    expect(mockUpsertSubscriptionTier).toHaveBeenCalledWith('creator-1', expect.objectContaining({
      pricePerMonth: 50,
      tier: 'basic',
    }));

    // Verify subscribe was called with the auto-created tier
    expect(mockSubscribe).toHaveBeenCalledWith('user-1', 'creator-1', 'tier-default');
  });

  it('uses existing tier when available', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockGetCreatorTiers.mockResolvedValue([{
      id: 'tier-gold',
      name: 'Gold',
      pricePerMonth: 200,
    }]);
    mockSubscribe.mockResolvedValue({
      id: 'sub-1',
      status: 'active',
      expiresAt: new Date(),
    });

    const req = makeRequest({ creatorId: 'creator-1' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toContain('Gold');

    // Should NOT create a default tier
    expect(mockUpsertSubscriptionTier).not.toHaveBeenCalled();
    expect(mockSubscribe).toHaveBeenCalledWith('user-1', 'creator-1', 'tier-gold');
  });

  it('returns 400 when already subscribed', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockGetCreatorTiers.mockResolvedValue([{ id: 'tier-1', name: 'Sub' }]);
    mockSubscribe.mockRejectedValue(new Error('Already subscribed'));

    const req = makeRequest({ creatorId: 'creator-1' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('already subscribed');
  });

  it('parses structured insufficient balance error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockGetCreatorTiers.mockResolvedValue([{ id: 'tier-1', name: 'Sub' }]);
    mockSubscribe.mockRejectedValue(new Error('INSUFFICIENT_BALANCE:100:30:50:20'));

    const req = makeRequest({ creatorId: 'creator-1' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.insufficientBalance).toBe(true);
    expect(body.required).toBe(100);
    expect(body.available).toBe(30);
    expect(body.total).toBe(50);
    expect(body.held).toBe(20);
    // Should mention held coins when > 0
    expect(body.error).toContain('held');
  });

  it('handles simple insufficient balance error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockGetCreatorTiers.mockResolvedValue([{ id: 'tier-1', name: 'Sub' }]);
    mockSubscribe.mockRejectedValue(new Error('Not enough coins'));

    const req = makeRequest({ creatorId: 'creator-1' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.insufficientBalance).toBe(true);
  });

  it('returns 500 for wallet not found errors', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockGetCreatorTiers.mockResolvedValue([{ id: 'tier-1', name: 'Sub' }]);
    mockSubscribe.mockRejectedValue(new Error('Wallet not found'));

    const req = makeRequest({ creatorId: 'creator-1' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain('try again');
  });

  it('returns generic 500 for unknown errors', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockGetCreatorTiers.mockResolvedValue([{ id: 'tier-1', name: 'Sub' }]);
    mockSubscribe.mockRejectedValue(new Error('Unknown DB error'));

    const req = makeRequest({ creatorId: 'creator-1' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Something went wrong. Please try again.');
  });
});
