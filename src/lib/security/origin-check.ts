/**
 * Origin/Referer Validation for CSRF Mitigation
 *
 * Used alongside SameSite=Lax cookies to provide defense-in-depth
 * against CSRF attacks on high-risk mutation routes.
 *
 * OWASP recommends "verifying same origin with standard headers"
 * as a stateless CSRF mitigation technique.
 */

const RAW_ALLOWED = [
  process.env.NEXT_PUBLIC_APP_URL,
  'https://digis.cc',
  'https://www.digis.cc',
  // Add localhost for development
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
].filter(Boolean) as string[];

// Normalize to origins (scheme + host + port)
const ALLOWED_ORIGINS = RAW_ALLOWED.map((u) => {
  try {
    return new URL(u).origin;
  } catch {
    return null;
  }
}).filter(Boolean) as string[];

export interface OriginCheckResult {
  ok: boolean;
  reason?: 'missing_origin_and_referer' | 'invalid_header_url' | 'origin_not_allowed';
  candidateOrigin?: string;
}

/**
 * Origin/Referer validation to mitigate CSRF for cookie-auth routes.
 *
 * - For same-origin fetch/XHR, Origin is typically present.
 * - For some requests, Origin may be null/absent; Referer might exist.
 * - We require at least one header for high-risk routes by default.
 *
 * @param request - The incoming request
 * @param opts.requireHeader - If true (default), reject if neither Origin nor Referer is present
 */
export function assertValidOrigin(
  request: Request,
  opts?: { requireHeader?: boolean }
): OriginCheckResult {
  const requireHeader = opts?.requireHeader ?? true;

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // No Origin and no Referer
  if (!origin && !referer) {
    if (requireHeader) {
      return { ok: false, reason: 'missing_origin_and_referer' };
    }
    // Allow if headers not required (for less sensitive routes)
    return { ok: true };
  }

  // Use Origin if present, otherwise fall back to Referer
  const candidate = origin ?? referer!;
  let candidateOrigin: string;

  try {
    candidateOrigin = new URL(candidate).origin;
  } catch {
    return { ok: false, reason: 'invalid_header_url' };
  }

  // Check against allowlist
  if (!ALLOWED_ORIGINS.includes(candidateOrigin)) {
    return { ok: false, reason: 'origin_not_allowed', candidateOrigin };
  }

  return { ok: true };
}

/**
 * Simple boolean check for use in conditionals
 */
export function isValidOrigin(request: Request, opts?: { requireHeader?: boolean }): boolean {
  return assertValidOrigin(request, opts).ok;
}
