/**
 * Stripe Webhook Handler Tests
 *
 * Tests critical webhook security:
 * 1. Signature validation (rejects invalid signatures)
 * 2. Timestamp validation (rejects stale events)
 * 3. Event type allowlist
 * 4. Idempotency via WalletService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Stripe from 'stripe';

// Mock Sentry before other imports
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

// Mock Stripe
const mockConstructEvent = vi.fn();
vi.mock('@/lib/stripe/config', () => ({
  stripe: {
    webhooks: {
      constructEvent: (...args: unknown[]) => mockConstructEvent(...args),
    },
  },
}));

// Mock WalletService
const mockCreateTransaction = vi.fn();
vi.mock('@/lib/wallet/wallet-service', () => ({
  WalletService: {
    createTransaction: (...args: unknown[]) => mockCreateTransaction(...args),
  },
}));

// Mock DB
vi.mock('@/lib/data/system', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(() => Promise.resolve({
          id: 'user-1',
          email: 'test@example.com',
          username: 'testuser',
          displayName: 'Test User',
        })),
      },
    },
  },
  users: { id: 'id' },
}));

// Mock email
vi.mock('@/lib/email/payout-notifications', () => ({
  sendCoinPurchaseEmail: vi.fn(() => Promise.resolve()),
}));

describe('Stripe Webhook Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set required env var
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_secret');
  });

  describe('Signature Validation', () => {
    it('rejects requests without stripe-signature header', async () => {
      const { POST } = await import('@/app/api/stripe/webhook/route');

      const request = new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        body: '{}',
        headers: {}, // No signature header
      });

      const response = await POST(request as any);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe('Missing signature');
    });

    it('rejects requests with invalid signature', async () => {
      // Mock constructEvent to throw on invalid signature
      mockConstructEvent.mockImplementation(() => {
        throw new Error('No signatures found matching the expected signature for payload');
      });

      const { POST } = await import('@/app/api/stripe/webhook/route');

      const request = new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        body: '{"type": "checkout.session.completed"}',
        headers: {
          'stripe-signature': 'invalid_signature',
        },
      });

      const response = await POST(request as any);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe('Invalid signature');
    });

    it('accepts requests with valid signature', async () => {
      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        created: Math.floor(Date.now() / 1000), // Fresh timestamp
        data: {
          object: {
            id: 'cs_test_123',
            payment_status: 'paid',
            metadata: {
              userId: 'user-1',
              coins: '100',
              packageId: 'pkg-1',
            },
            amount_total: 1000,
          } as any,
        },
      };

      mockConstructEvent.mockReturnValue(mockEvent);
      mockCreateTransaction.mockResolvedValue({ id: 'tx-1' });

      const { POST } = await import('@/app/api/stripe/webhook/route');

      const request = new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': 't=1234567890,v1=validhash,v0=ignored',
        },
      });

      const response = await POST(request as any);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.received).toBe(true);
    });
  });

  describe('Timestamp Validation', () => {
    it('rejects events older than 5 minutes', async () => {
      const sixMinutesAgo = Math.floor(Date.now() / 1000) - 360; // 6 minutes ago

      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_old_123',
        type: 'checkout.session.completed',
        created: sixMinutesAgo,
        data: {
          object: {
            id: 'cs_test_123',
            payment_status: 'paid',
            metadata: { userId: 'user-1', coins: '100' },
          } as any,
        },
      };

      mockConstructEvent.mockReturnValue(mockEvent);

      const { POST } = await import('@/app/api/stripe/webhook/route');

      const request = new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': 't=1234567890,v1=validhash',
        },
      });

      const response = await POST(request as any);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe('Event too old');
    });

    it('accepts events within 5 minute window', async () => {
      const twoMinutesAgo = Math.floor(Date.now() / 1000) - 120;

      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_fresh_123',
        type: 'checkout.session.completed',
        created: twoMinutesAgo,
        data: {
          object: {
            id: 'cs_test_123',
            payment_status: 'paid',
            metadata: { userId: 'user-1', coins: '100', packageId: 'pkg-1' },
            amount_total: 1000,
          } as any,
        },
      };

      mockConstructEvent.mockReturnValue(mockEvent);
      mockCreateTransaction.mockResolvedValue({ id: 'tx-1' });

      const { POST } = await import('@/app/api/stripe/webhook/route');

      const request = new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': 't=1234567890,v1=validhash',
        },
      });

      const response = await POST(request as any);

      expect(response.status).toBe(200);
    });
  });

  describe('Event Type Allowlist', () => {
    it('ignores events not in allowlist', async () => {
      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_unknown_123',
        type: 'customer.created', // Not in allowlist
        created: Math.floor(Date.now() / 1000),
        data: { object: {} as any },
      };

      mockConstructEvent.mockReturnValue(mockEvent);

      const { POST } = await import('@/app/api/stripe/webhook/route');

      const request = new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': 't=1234567890,v1=validhash',
        },
      });

      const response = await POST(request as any);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.received).toBe(true);
      expect(json.ignored).toBe(true);
    });

    it('processes events in allowlist', async () => {
      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_allowed_123',
        type: 'checkout.session.completed',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: 'cs_test_123',
            payment_status: 'paid',
            metadata: { userId: 'user-1', coins: '100', packageId: 'pkg-1' },
            amount_total: 1000,
          } as any,
        },
      };

      mockConstructEvent.mockReturnValue(mockEvent);
      mockCreateTransaction.mockResolvedValue({ id: 'tx-1' });

      const { POST } = await import('@/app/api/stripe/webhook/route');

      const request = new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': 't=1234567890,v1=validhash',
        },
      });

      const response = await POST(request as any);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ignored).toBeUndefined();
    });
  });

  describe('Idempotency', () => {
    it('uses stripe session ID as idempotency key', async () => {
      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: 'cs_unique_session_id',
            payment_status: 'paid',
            metadata: { userId: 'user-1', coins: '100', packageId: 'pkg-1' },
            amount_total: 1000,
          } as any,
        },
      };

      mockConstructEvent.mockReturnValue(mockEvent);
      mockCreateTransaction.mockResolvedValue({ id: 'tx-1' });

      const { POST } = await import('@/app/api/stripe/webhook/route');

      const request = new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': 't=1234567890,v1=validhash',
        },
      });

      await POST(request as any);

      // Verify idempotency key format
      expect(mockCreateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          idempotencyKey: 'stripe_cs_unique_session_id',
        })
      );
    });

    it('same session ID does not double-credit (handled by WalletService)', async () => {
      // First call succeeds
      mockCreateTransaction.mockResolvedValueOnce({ id: 'tx-1' });

      // Second call returns existing transaction (idempotent)
      mockCreateTransaction.mockResolvedValueOnce({ id: 'tx-1' });

      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: 'cs_duplicate_session',
            payment_status: 'paid',
            metadata: { userId: 'user-1', coins: '100', packageId: 'pkg-1' },
            amount_total: 1000,
          } as any,
        },
      };

      mockConstructEvent.mockReturnValue(mockEvent);

      const { POST } = await import('@/app/api/stripe/webhook/route');

      // First webhook call
      const request1 = new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 't=1234567890,v1=validhash' },
      });
      await POST(request1 as any);

      // Second webhook call (retry)
      const request2 = new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 't=1234567890,v1=validhash' },
      });
      await POST(request2 as any);

      // Both should use the same idempotency key
      expect(mockCreateTransaction).toHaveBeenCalledTimes(2);
      expect(mockCreateTransaction).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ idempotencyKey: 'stripe_cs_duplicate_session' })
      );
      expect(mockCreateTransaction).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ idempotencyKey: 'stripe_cs_duplicate_session' })
      );
    });
  });

  describe('Checkout Session Processing', () => {
    it('skips processing when payment_status is not paid', async () => {
      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: 'cs_test_123',
            payment_status: 'unpaid', // Not paid
            metadata: { userId: 'user-1', coins: '100' },
          } as any,
        },
      };

      mockConstructEvent.mockReturnValue(mockEvent);

      const { POST } = await import('@/app/api/stripe/webhook/route');

      const request = new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 't=1234567890,v1=validhash' },
      });

      await POST(request as any);

      // Should not attempt to create transaction
      expect(mockCreateTransaction).not.toHaveBeenCalled();
    });

    it('skips processing when metadata is missing', async () => {
      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: 'cs_test_123',
            payment_status: 'paid',
            metadata: {}, // Missing userId and coins
          } as any,
        },
      };

      mockConstructEvent.mockReturnValue(mockEvent);

      const { POST } = await import('@/app/api/stripe/webhook/route');

      const request = new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 't=1234567890,v1=validhash' },
      });

      await POST(request as any);

      expect(mockCreateTransaction).not.toHaveBeenCalled();
    });

    it('returns 500 when wallet credit fails (for Stripe retry)', async () => {
      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: 'cs_test_123',
            payment_status: 'paid',
            metadata: { userId: 'user-1', coins: '100', packageId: 'pkg-1' },
            amount_total: 1000,
          } as any,
        },
      };

      mockConstructEvent.mockReturnValue(mockEvent);
      mockCreateTransaction.mockRejectedValue(new Error('DB connection failed'));

      const { POST } = await import('@/app/api/stripe/webhook/route');

      const request = new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 't=1234567890,v1=validhash' },
      });

      const response = await POST(request as any);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error).toBe('Failed to credit wallet');
    });
  });
});
