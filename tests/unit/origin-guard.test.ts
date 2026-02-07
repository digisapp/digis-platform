/**
 * withOriginGuard HOF Tests
 *
 * Tests the higher-order function that wraps route handlers
 * with Origin/Referer CSRF validation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the origin-check module
vi.mock('@/lib/security/origin-check', () => ({
  assertValidOrigin: vi.fn(),
}));

import { withOriginGuard } from '@/lib/security/withOriginGuard';
import { assertValidOrigin } from '@/lib/security/origin-check';
import { NextResponse } from 'next/server';

const mockAssertValidOrigin = vi.mocked(assertValidOrigin);

beforeEach(() => {
  mockAssertValidOrigin.mockReset();
});

describe('withOriginGuard', () => {
  it('calls handler when origin is valid', async () => {
    mockAssertValidOrigin.mockReturnValue({ ok: true });

    const handler = vi.fn().mockResolvedValue(
      NextResponse.json({ success: true })
    );

    const guarded = withOriginGuard(handler);
    const request = new Request('https://digis.cc/api/test', {
      method: 'POST',
      headers: { origin: 'https://digis.cc' },
    });

    const response = await guarded(request);
    expect(handler).toHaveBeenCalledWith(request);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it('returns 403 when origin is invalid', async () => {
    mockAssertValidOrigin.mockReturnValue({
      ok: false,
      reason: 'origin_not_allowed',
      candidateOrigin: 'https://evil.com',
    });

    const handler = vi.fn();
    const guarded = withOriginGuard(handler);
    const request = new Request('https://digis.cc/api/test', {
      method: 'POST',
      headers: { origin: 'https://evil.com' },
    });

    const response = await guarded(request);
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.error).toBe('Invalid origin');
    expect(body.code).toBe('INVALID_ORIGIN');

    // Handler should NOT be called
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 403 when origin headers are missing', async () => {
    mockAssertValidOrigin.mockReturnValue({
      ok: false,
      reason: 'missing_origin_and_referer',
    });

    const handler = vi.fn();
    const guarded = withOriginGuard(handler);
    const request = new Request('https://digis.cc/api/test', { method: 'POST' });

    const response = await guarded(request);
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it('passes requireHeader option through', async () => {
    mockAssertValidOrigin.mockReturnValue({ ok: true });

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const guarded = withOriginGuard(handler, { requireHeader: false });
    const request = new Request('https://digis.cc/api/test', { method: 'POST' });

    await guarded(request);

    expect(mockAssertValidOrigin).toHaveBeenCalledWith(request, { requireHeader: false });
  });

  it('defaults requireHeader to true', async () => {
    mockAssertValidOrigin.mockReturnValue({ ok: true });

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const guarded = withOriginGuard(handler);
    const request = new Request('https://digis.cc/api/test', { method: 'POST' });

    await guarded(request);

    expect(mockAssertValidOrigin).toHaveBeenCalledWith(request, { requireHeader: true });
  });

  it('logs warning on blocked request', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockAssertValidOrigin.mockReturnValue({
      ok: false,
      reason: 'origin_not_allowed',
      candidateOrigin: 'https://evil.com',
    });

    const handler = vi.fn();
    const guarded = withOriginGuard(handler);
    const request = new Request('https://digis.cc/api/wallet', {
      method: 'POST',
      headers: { origin: 'https://evil.com' },
    });

    await guarded(request);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[withOriginGuard]')
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('origin_not_allowed')
    );
    warnSpy.mockRestore();
  });
});
