/**
 * Client-side instrumentation for Next.js 15+ / Turbopack
 * This file replaces sentry.client.config.ts for Turbopack compatibility
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replay for debugging user issues
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Enable in all environments
  enabled: true,

  // Ignore common non-actionable errors
  ignoreErrors: [
    // Browser extensions
    /chrome-extension/,
    /moz-extension/,
    // Network errors
    'Network request failed',
    'Failed to fetch',
    'Load failed',
    // User cancelled
    'AbortError',
    // Stripe
    'StripeCardError',
    // Next.js navigation
    'NEXT_REDIRECT',
    'NEXT_NOT_FOUND',
  ],

  // Filter out sensitive data
  beforeSend(event) {
    // Remove any PII from error reports
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    return event;
  },

  integrations: [
    Sentry.replayIntegration({
      // Mask all text content for privacy
      maskAllText: true,
      // Block all media for privacy
      blockAllMedia: true,
    }),
  ],
});
