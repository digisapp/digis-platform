/**
 * Error Boundary Tests
 *
 * Tests the three error boundary class components:
 * 1. StreamErrorBoundary - for live streams/VODs
 * 2. CallErrorBoundary - for video calls
 * 3. PaymentErrorBoundary - for payment/purchase modals
 *
 * Tests static methods (getDerivedStateFromError) and instance methods
 * (componentDidCatch, handleRetry, handleLeave/handleEndCall/handleClose)
 * directly without requiring a DOM environment.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Sentry
const mockCaptureException = vi.fn();
vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: any[]) => mockCaptureException(...args),
}));

// Mock lucide-react (class components import icons)
vi.mock('lucide-react', () => ({
  RefreshCw: 'RefreshCw',
  ArrowLeft: 'ArrowLeft',
  AlertTriangle: 'AlertTriangle',
  PhoneOff: 'PhoneOff',
  X: 'X',
  CreditCard: 'CreditCard',
}));

import { StreamErrorBoundary } from '@/components/error-boundaries/StreamErrorBoundary';
import { CallErrorBoundary } from '@/components/error-boundaries/CallErrorBoundary';
import { PaymentErrorBoundary } from '@/components/error-boundaries/PaymentErrorBoundary';

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── StreamErrorBoundary ────────────────────────────────────────────

describe('StreamErrorBoundary', () => {
  it('getDerivedStateFromError returns hasError and error', () => {
    const error = new Error('Stream crashed');
    const state = StreamErrorBoundary.getDerivedStateFromError(error);
    expect(state).toEqual({ hasError: true, error });
  });

  it('componentDidCatch reports to Sentry with stream tags', () => {
    const boundary = new StreamErrorBoundary({ children: null, streamId: 'stream-123', creatorName: 'Alice' });
    boundary.state = { hasError: true, error: null, retryCount: 1 };

    const error = new Error('LiveKit failed');
    const errorInfo = { componentStack: '/LiveKitRoom/VideoTrack' } as any;

    boundary.componentDidCatch(error, errorInfo);

    expect(mockCaptureException).toHaveBeenCalledOnce();
    expect(mockCaptureException).toHaveBeenCalledWith(error, {
      tags: {
        component: 'stream',
        streamId: 'stream-123',
      },
      extra: {
        componentStack: '/LiveKitRoom/VideoTrack',
        creatorName: 'Alice',
        retryCount: 1,
      },
    });
  });

  it('handleRetry increments retryCount and resets error', () => {
    const onRetry = vi.fn();
    const boundary = new StreamErrorBoundary({ children: null, onRetry });
    boundary.state = { hasError: true, error: new Error('fail'), retryCount: 0 };
    // Mock setState to apply state synchronously
    boundary.setState = vi.fn((updater: any) => {
      if (typeof updater === 'function') {
        Object.assign(boundary.state, updater(boundary.state));
      } else {
        Object.assign(boundary.state, updater);
      }
    });

    boundary.handleRetry();

    expect(boundary.setState).toHaveBeenCalled();
    expect(boundary.state.hasError).toBe(false);
    expect(boundary.state.error).toBeNull();
    expect(boundary.state.retryCount).toBe(1);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('handleRetry no-ops when retryCount >= maxRetries (3)', () => {
    const onRetry = vi.fn();
    const boundary = new StreamErrorBoundary({ children: null, onRetry });
    boundary.state = { hasError: true, error: new Error('fail'), retryCount: 3 };
    boundary.setState = vi.fn();

    boundary.handleRetry();

    expect(boundary.setState).not.toHaveBeenCalled();
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('handleLeave calls onLeave prop when provided', () => {
    const onLeave = vi.fn();
    const boundary = new StreamErrorBoundary({ children: null, onLeave });

    boundary.handleLeave();

    expect(onLeave).toHaveBeenCalledOnce();
  });

  it('handleLeave falls back to history.back() when no onLeave prop', () => {
    const mockBack = vi.fn();
    vi.stubGlobal('window', { history: { back: mockBack }, location: {} });

    const boundary = new StreamErrorBoundary({ children: null });

    boundary.handleLeave();

    expect(mockBack).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it('handleRetry works for consecutive retries up to max', () => {
    const onRetry = vi.fn();
    const boundary = new StreamErrorBoundary({ children: null, onRetry });
    boundary.state = { hasError: true, error: new Error('fail'), retryCount: 0 };
    boundary.setState = vi.fn((updater: any) => {
      if (typeof updater === 'function') {
        Object.assign(boundary.state, updater(boundary.state));
      } else {
        Object.assign(boundary.state, updater);
      }
    });

    // Retry 3 times (0 -> 1, 1 -> 2, 2 -> 3)
    boundary.handleRetry();
    boundary.state.hasError = true; // simulating re-error
    boundary.handleRetry();
    boundary.state.hasError = true;
    boundary.handleRetry();

    expect(boundary.state.retryCount).toBe(3);
    expect(onRetry).toHaveBeenCalledTimes(3);

    // 4th retry should no-op
    boundary.state.hasError = true;
    boundary.handleRetry();
    expect(boundary.state.retryCount).toBe(3);
    expect(onRetry).toHaveBeenCalledTimes(3);
  });
});

// ─── CallErrorBoundary ──────────────────────────────────────────────

describe('CallErrorBoundary', () => {
  it('getDerivedStateFromError returns hasError and error', () => {
    const error = new Error('WebRTC failed');
    const state = CallErrorBoundary.getDerivedStateFromError(error);
    expect(state).toEqual({ hasError: true, error });
  });

  it('componentDidCatch reports to Sentry with video_call tags', () => {
    const boundary = new CallErrorBoundary({ children: null, callId: 'call-456', participantName: 'Bob' });
    boundary.state = { hasError: true, error: null, retryCount: 0 };

    const error = new Error('ICE connection failed');
    const errorInfo = { componentStack: '/CallRoom/VideoTrack' } as any;

    boundary.componentDidCatch(error, errorInfo);

    expect(mockCaptureException).toHaveBeenCalledOnce();
    expect(mockCaptureException).toHaveBeenCalledWith(error, {
      tags: {
        component: 'video_call',
        callId: 'call-456',
      },
      extra: {
        componentStack: '/CallRoom/VideoTrack',
        participantName: 'Bob',
        retryCount: 0,
      },
    });
  });

  it('maxRetries is 2 (stricter than stream)', () => {
    const onRetry = vi.fn();
    const boundary = new CallErrorBoundary({ children: null, onRetry });
    boundary.state = { hasError: true, error: new Error('fail'), retryCount: 2 };
    boundary.setState = vi.fn();

    // At retryCount=2 with maxRetries=2, should no-op
    boundary.handleRetry();

    expect(boundary.setState).not.toHaveBeenCalled();
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('handleRetry works within limit', () => {
    const onRetry = vi.fn();
    const boundary = new CallErrorBoundary({ children: null, onRetry });
    boundary.state = { hasError: true, error: new Error('fail'), retryCount: 1 };
    boundary.setState = vi.fn((updater: any) => {
      if (typeof updater === 'function') {
        Object.assign(boundary.state, updater(boundary.state));
      } else {
        Object.assign(boundary.state, updater);
      }
    });

    boundary.handleRetry();

    expect(boundary.state.retryCount).toBe(2);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('handleEndCall calls onEndCall prop when provided', () => {
    const onEndCall = vi.fn();
    const boundary = new CallErrorBoundary({ children: null, onEndCall });

    boundary.handleEndCall();

    expect(onEndCall).toHaveBeenCalledOnce();
  });

  it('handleEndCall navigates to /dashboard when no prop', () => {
    const mockLocation = { href: '' };
    vi.stubGlobal('window', { location: mockLocation });

    const boundary = new CallErrorBoundary({ children: null });

    boundary.handleEndCall();

    expect(mockLocation.href).toBe('/dashboard');
    vi.unstubAllGlobals();
  });
});

// ─── PaymentErrorBoundary ───────────────────────────────────────────

describe('PaymentErrorBoundary', () => {
  it('getDerivedStateFromError returns hasError and error', () => {
    const error = new Error('Stripe error');
    const state = PaymentErrorBoundary.getDerivedStateFromError(error);
    expect(state).toEqual({ hasError: true, error });
  });

  it('componentDidCatch reports to Sentry with payment tags', () => {
    const boundary = new PaymentErrorBoundary({
      children: null,
      transactionType: 'purchase',
      amount: 999,
    });
    boundary.state = { hasError: true, error: null };

    const error = new Error('Checkout session expired');
    const errorInfo = { componentStack: '/BuyCoinsModal/EmbeddedCheckout' } as any;

    boundary.componentDidCatch(error, errorInfo);

    expect(mockCaptureException).toHaveBeenCalledOnce();
    expect(mockCaptureException).toHaveBeenCalledWith(error, {
      level: 'error',
      tags: {
        component: 'payment',
        transactionType: 'purchase',
      },
      extra: {
        componentStack: '/BuyCoinsModal/EmbeddedCheckout',
        amount: 999,
      },
    });
  });

  it('handleRetry always resets (no retry limit)', () => {
    const onRetry = vi.fn();
    const boundary = new PaymentErrorBoundary({ children: null, onRetry });
    boundary.state = { hasError: true, error: new Error('fail') };
    boundary.setState = vi.fn((updater: any) => {
      if (typeof updater === 'function') {
        Object.assign(boundary.state, updater(boundary.state));
      } else {
        Object.assign(boundary.state, updater);
      }
    });

    // Should always work, no retry count
    boundary.handleRetry();
    expect(boundary.state.hasError).toBe(false);
    expect(boundary.state.error).toBeNull();
    expect(onRetry).toHaveBeenCalledOnce();

    // Retry again - still works
    boundary.state.hasError = true;
    boundary.state.error = new Error('fail again');
    boundary.handleRetry();
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('handleClose calls onClose prop', () => {
    const onClose = vi.fn();
    const boundary = new PaymentErrorBoundary({ children: null, onClose });

    boundary.handleClose();

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('getTransactionLabel returns correct labels', () => {
    const cases: Array<{ type: string; expected: string }> = [
      { type: 'tip', expected: 'tip' },
      { type: 'gift', expected: 'gift' },
      { type: 'purchase', expected: 'coin purchase' },
      { type: 'subscription', expected: 'subscription' },
      { type: 'unknown', expected: 'payment' },
    ];

    for (const { type, expected } of cases) {
      const boundary = new PaymentErrorBoundary({ children: null, transactionType: type });
      expect(boundary.getTransactionLabel()).toBe(expected);
    }
  });

  it('getTransactionLabel returns "payment" when no transactionType', () => {
    const boundary = new PaymentErrorBoundary({ children: null });
    expect(boundary.getTransactionLabel()).toBe('payment');
  });
});
