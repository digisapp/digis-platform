import { headers } from 'next/headers';

/**
 * Get the request ID from the current request headers.
 * Used for distributed tracing and correlating logs across services.
 *
 * The request ID is generated in middleware and propagated via the x-request-id header.
 *
 * @returns The request ID or a generated fallback if not available
 */
export async function getRequestId(): Promise<string> {
  try {
    const headersList = await headers();
    const requestId = headersList.get('x-request-id');
    if (requestId) return requestId;
  } catch {
    // headers() not available (e.g., in non-request context)
  }

  // Fallback: generate a new request ID
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Get the request ID synchronously from a NextRequest object.
 * Use this in API routes where you have direct access to the request.
 *
 * @param request The NextRequest object
 * @returns The request ID or a generated fallback
 */
export function getRequestIdFromRequest(request: Request): string {
  const requestId = request.headers.get('x-request-id');
  if (requestId) return requestId;

  // Fallback: generate a new request ID
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Get the IP address from a request, hashed for privacy.
 * Used for audit logging without storing raw IP addresses.
 */
export function getClientIp(request: Request): string | undefined {
  // Try various headers in order of preference
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') || // Cloudflare
    undefined;

  return ip;
}

/**
 * Get the user agent from a request.
 */
export function getUserAgent(request: Request): string | undefined {
  return request.headers.get('user-agent') || undefined;
}

/**
 * Get all request metadata for audit logging.
 */
export function getRequestMetadata(request: Request): {
  requestId: string;
  ipAddress: string | undefined;
  userAgent: string | undefined;
} {
  return {
    requestId: getRequestIdFromRequest(request),
    ipAddress: getClientIp(request),
    userAgent: getUserAgent(request),
  };
}
