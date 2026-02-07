/**
 * Origin/CSRF Check Tests
 *
 * Tests the origin validation logic used for CSRF mitigation.
 * Note: These tests rely on env vars being set or not set.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to re-import the module for each test because the ALLOWED_ORIGINS
// are computed at module load time based on env vars.
// For these tests, we test the module as-is with current env settings.

describe('origin-check', () => {
  let assertValidOrigin: typeof import('@/lib/security/origin-check').assertValidOrigin;
  let isValidOrigin: typeof import('@/lib/security/origin-check').isValidOrigin;

  beforeEach(async () => {
    // Re-import to get fresh module
    vi.resetModules();
    const mod = await import('@/lib/security/origin-check');
    assertValidOrigin = mod.assertValidOrigin;
    isValidOrigin = mod.isValidOrigin;
  });

  describe('assertValidOrigin', () => {
    it('rejects when no Origin and no Referer headers (requireHeader=true)', () => {
      const request = new Request('https://digis.cc/api/test', {
        method: 'POST',
      });

      const result = assertValidOrigin(request);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('missing_origin_and_referer');
    });

    it('allows when no headers if requireHeader is false', () => {
      const request = new Request('https://digis.cc/api/test', {
        method: 'POST',
      });

      const result = assertValidOrigin(request, { requireHeader: false });
      expect(result.ok).toBe(true);
    });

    it('rejects invalid Origin URL', () => {
      const request = new Request('https://digis.cc/api/test', {
        method: 'POST',
        headers: { origin: 'not-a-valid-url' },
      });

      const result = assertValidOrigin(request);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('invalid_header_url');
    });

    it('rejects disallowed origin', () => {
      const request = new Request('https://digis.cc/api/test', {
        method: 'POST',
        headers: { origin: 'https://evil-site.com' },
      });

      const result = assertValidOrigin(request);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('origin_not_allowed');
      expect(result.candidateOrigin).toBe('https://evil-site.com');
    });

    it('accepts allowed origin (digis.cc)', () => {
      const request = new Request('https://digis.cc/api/test', {
        method: 'POST',
        headers: { origin: 'https://digis.cc' },
      });

      const result = assertValidOrigin(request);
      expect(result.ok).toBe(true);
    });

    it('accepts www.digis.cc origin', () => {
      const request = new Request('https://digis.cc/api/test', {
        method: 'POST',
        headers: { origin: 'https://www.digis.cc' },
      });

      const result = assertValidOrigin(request);
      expect(result.ok).toBe(true);
    });

    it('falls back to Referer when Origin is absent', () => {
      const request = new Request('https://digis.cc/api/test', {
        method: 'POST',
        headers: { referer: 'https://digis.cc/some/page' },
      });

      const result = assertValidOrigin(request);
      expect(result.ok).toBe(true);
    });

    it('rejects disallowed Referer', () => {
      const request = new Request('https://digis.cc/api/test', {
        method: 'POST',
        headers: { referer: 'https://evil-site.com/phishing' },
      });

      const result = assertValidOrigin(request);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('origin_not_allowed');
    });

    it('prefers Origin over Referer when both present', () => {
      const request = new Request('https://digis.cc/api/test', {
        method: 'POST',
        headers: {
          origin: 'https://digis.cc',
          referer: 'https://evil-site.com',
        },
      });

      // Origin is checked first and it's valid
      const result = assertValidOrigin(request);
      expect(result.ok).toBe(true);
    });
  });

  describe('isValidOrigin', () => {
    it('returns true for valid origin', () => {
      const request = new Request('https://digis.cc/api/test', {
        method: 'POST',
        headers: { origin: 'https://digis.cc' },
      });

      expect(isValidOrigin(request)).toBe(true);
    });

    it('returns false for missing headers', () => {
      const request = new Request('https://digis.cc/api/test', {
        method: 'POST',
      });

      expect(isValidOrigin(request)).toBe(false);
    });

    it('returns false for disallowed origin', () => {
      const request = new Request('https://digis.cc/api/test', {
        method: 'POST',
        headers: { origin: 'https://attacker.com' },
      });

      expect(isValidOrigin(request)).toBe(false);
    });

    it('passes opts through', () => {
      const request = new Request('https://digis.cc/api/test', {
        method: 'POST',
      });

      expect(isValidOrigin(request, { requireHeader: false })).toBe(true);
    });
  });
});
