import * as Sentry from '@sentry/nextjs';

/**
 * Next.js Instrumentation file
 * This is the new recommended way to configure Sentry for Next.js 15+ / Turbopack
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side Sentry initialization
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime Sentry initialization
    await import('../sentry.edge.config');
  }
}

/**
 * Capture errors from nested React Server Components
 * This hook is called when an error occurs during request handling
 */
export function onRequestError(
  error: { digest: string } & Error,
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string };
  },
  context: {
    routerKind: 'Pages Router' | 'App Router';
    routePath: string;
    routeType: 'render' | 'route' | 'action' | 'middleware';
    renderSource?: 'react-server-components' | 'react-server-components-payload' | 'server-rendering';
    revalidateReason?: 'on-demand' | 'stale' | undefined;
    renderType?: 'static' | 'dynamic';
  }
) {
  // Don't report errors with specific digests (Next.js internal redirects, etc.)
  const ignoredDigests = ['NEXT_REDIRECT', 'NEXT_NOT_FOUND'];
  if (error.digest && ignoredDigests.some(d => error.digest.includes(d))) {
    return;
  }

  Sentry.captureException(error, {
    tags: {
      'next.router_kind': context.routerKind,
      'next.route_path': context.routePath,
      'next.route_type': context.routeType,
      'next.render_source': context.renderSource,
      'next.render_type': context.renderType,
    },
    extra: {
      request_path: request.path,
      request_method: request.method,
      revalidate_reason: context.revalidateReason,
    },
  });
}
