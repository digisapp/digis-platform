/**
 * Content Purchase API Route Tests
 *
 * Tests: POST /api/content/[contentId]/purchase
 * Covers: auth, rate limiting, purchase delegation to ContentService,
 * notification side-effects, error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

const mockPurchaseContent = vi.fn();
vi.mock('@/lib/content/content-service', () => ({
  ContentService: {
    purchaseContent: (...args: any[]) => mockPurchaseContent(...args),
  },
}));

vi.mock('@/lib/services/notification-service', () => ({
  NotificationService: {
    sendNotification: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('@/lib/email/creator-earnings', () => ({
  notifyContentPurchase: vi.fn(() => Promise.resolve()),
}));

const mockFindFirstContent = vi.fn();
const mockFindFirstUser = vi.fn();
vi.mock('@/lib/data/system', () => ({
  db: {
    query: {
      contentItems: { findFirst: (...args: any[]) => mockFindFirstContent(...args) },
      users: { findFirst: (...args: any[]) => mockFindFirstUser(...args) },
    },
  },
  users: { id: 'id' },
  contentItems: { id: 'id' },
}));

const mockRateLimitFinancial = vi.fn();
vi.mock('@/lib/rate-limit', () => ({
  rateLimitFinancial: (...args: any[]) => mockRateLimitFinancial(...args),
}));

// ─── Import route handler ──────────────────────────────────────────────────────

import { POST } from '@/app/api/content/[contentId]/purchase/route';
import { NextRequest } from 'next/server';

function makeRequest(contentId: string) {
  const req = new NextRequest('http://localhost/api/content/' + contentId + '/purchase', {
    method: 'POST',
  });
  return { req, params: Promise.resolve({ contentId }) };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/content/[contentId]/purchase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimitFinancial.mockResolvedValue({ ok: true });
  });

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } });

    const { req, params } = makeRequest('content-1');
    const res = await POST(req, { params });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 429 when rate limited', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockRateLimitFinancial.mockResolvedValue({ ok: false, error: 'Rate limit exceeded', retryAfter: 45 });

    const { req, params } = makeRequest('content-1');
    const res = await POST(req, { params });
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toBe('Rate limit exceeded');
    expect(res.headers.get('Retry-After')).toBe('45');
  });

  it('returns 400 when ContentService rejects purchase', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockPurchaseContent.mockResolvedValue({ success: false, error: 'Insufficient balance' });

    const { req, params } = makeRequest('content-1');
    const res = await POST(req, { params });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Insufficient balance');
  });

  it('completes purchase and returns success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockPurchaseContent.mockResolvedValue({
      success: true,
      purchase: { id: 'p-1', coinsSpent: 50 },
    });
    // Mock notification queries
    mockFindFirstContent.mockResolvedValue({ title: 'Photo Set', creatorId: 'creator-1', unlockPrice: 50 });
    mockFindFirstUser.mockResolvedValue({ username: 'buyer', displayName: 'Buyer', avatarUrl: null, email: 'c@c.com' });

    const { req, params } = makeRequest('content-1');
    const res = await POST(req, { params });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.purchase.coinsSpent).toBe(50);
    expect(body.message).toBe('Content unlocked successfully!');

    // Verify ContentService was called with correct args
    expect(mockPurchaseContent).toHaveBeenCalledWith('user-1', 'content-1');
  });

  it('returns 200 for free content purchase', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockPurchaseContent.mockResolvedValue({
      success: true,
      purchase: { id: 'p-2', coinsSpent: 0 },
    });

    const { req, params } = makeRequest('content-1');
    const res = await POST(req, { params });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    // No notifications should fire for 0-coin purchases (coinsSpent <= 0)
  });

  it('returns 500 for unexpected errors', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockPurchaseContent.mockRejectedValue(new Error('DB connection lost'));

    const { req, params } = makeRequest('content-1');
    const res = await POST(req, { params });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to purchase content');
  });

  it('calls rate limiter with correct parameters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockPurchaseContent.mockResolvedValue({ success: true, purchase: { id: 'p-1', coinsSpent: 0 } });

    const { req, params } = makeRequest('content-1');
    await POST(req, { params });

    expect(mockRateLimitFinancial).toHaveBeenCalledWith('user-1', 'unlock');
  });
});
