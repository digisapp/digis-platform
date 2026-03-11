import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * SINGLE SOURCE OF TRUTH for admin check in middleware
 * Matches the predicate in src/lib/auth/admin.ts
 * Only checks app_metadata.isAdmin === true
 */
function isAdminFromClaims(appMeta: Record<string, unknown> | null | undefined): boolean {
  return appMeta?.isAdmin === true;
}

/**
 * Detect in-app browsers (Instagram, Facebook, TikTok, etc.)
 * These WebViews break payments, auth, and WebRTC.
 */
function detectInAppBrowser(ua: string): string | null {
  if (/Instagram/i.test(ua)) return 'Instagram';
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'Facebook';
  if (/musical_ly|TikTok|BytedanceWebview/i.test(ua)) return 'TikTok';
  if (/Snapchat/i.test(ua)) return 'Snapchat';
  if (/Twitter/i.test(ua)) return 'Twitter';
  if (/LinkedInApp/i.test(ua)) return 'LinkedIn';
  return null;
}

function buildInAppBrowserPage(source: string, url: string, ua: string): string {
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  // Escape strategy:
  // Android: Auto-redirect to /api/escape-webview which returns fake PDF content-type.
  //   WebView can't handle PDF → delegates to Chrome → API detects real browser → redirects.
  //   User never sees the interstitial.
  // iOS: Button with cascading fallbacks:
  //   1. x-safari-https:// (Safari's private URL scheme, works iOS 15+)
  //   2. navigator.share() (native share sheet → "Open in Safari")
  //   3. Clipboard copy (last resort)

  const isInstagram = source === 'Instagram';
  const isTikTok = source === 'TikTok';

  let step1: string, step2: string;
  if (isInstagram) {
    step1 = 'Tap <strong>&middot;&middot;&middot;</strong> in the top right';
    step2 = isIOS ? 'Tap <strong>Open in Safari</strong>' : 'Tap <strong>Open in Chrome</strong>';
  } else if (isTikTok) {
    step1 = 'Tap <strong>&#8942;</strong> or the share icon';
    step2 = 'Tap <strong>Open in browser</strong>';
  } else {
    step1 = 'Tap the menu icon <strong>&#8942;</strong>';
    step2 = 'Tap <strong>Open in browser</strong>';
  }

  // Build the escape-webview API URL for Android auto-redirect
  const origin = new URL(url).origin;
  const escapeUrl = `${origin}/api/escape-webview?dest=${encodeURIComponent(url)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Open in Web | Digis</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #111827, #000, #111827);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #fff; padding: 1rem;
    }
    .glow { position: fixed; border-radius: 50%; filter: blur(80px); pointer-events: none; animation: pulse 3s ease-in-out infinite; }
    .glow-1 { width: 400px; height: 400px; top: -120px; left: -120px; background: rgba(6,182,212,0.15); }
    .glow-2 { width: 400px; height: 400px; bottom: -120px; right: -120px; background: rgba(168,85,247,0.15); animation-delay: 1s; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
    .card { position: relative; z-index: 1; max-width: 380px; width: 100%; text-align: center; }
    .card > * + * { margin-top: 1.5rem; }
    .logo { height: 36px; }
    h1 { font-size: 1.25rem; font-weight: 700; }
    .btn-open {
      display: block; width: 100%; padding: 1rem; border: none; border-radius: 1rem; cursor: pointer;
      background: linear-gradient(90deg, #06b6d4, #9333ea); color: #fff; font-size: 1.125rem; font-weight: 600;
      box-shadow: 0 8px 24px rgba(6,182,212,0.25); transition: transform 0.15s, box-shadow 0.15s;
    }
    .btn-open:active { transform: scale(0.98); }
    .btn-open.copied { background: linear-gradient(90deg, #059669, #10b981); }
    .divider { display: flex; align-items: center; gap: 0.75rem; color: #4b5563; font-size: 0.75rem; }
    .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.1); }
    .steps { text-align: left; }
    .step {
      display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 0.75rem; color: #d1d5db; font-size: 0.85rem; line-height: 1.4;
    }
    .step + .step { margin-top: 0.5rem; }
    .step-num {
      flex-shrink: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,0.1); border-radius: 50%;
      font-size: 0.75rem; font-weight: 700; color: #9ca3af;
    }
    .step strong { color: #fff; }
    .continue { background: none; border: none; color: #4b5563; font-size: 0.75rem; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
    .continue:hover { color: #9ca3af; }
  </style>
</head>
<body>
  <div class="glow glow-1"></div>
  <div class="glow glow-2"></div>
  <div class="card">
    <div><img src="/images/digis-logo-white.png" alt="Digis" class="logo"></div>
    <h1>Open in Web for Full Experience</h1>
    ${isIOS ? `
    <button class="btn-open" id="openBtn" onclick="openSafari()">Open in Safari</button>
    ` : `
    <p style="color:#9ca3af;font-size:0.9rem;">Redirecting to Chrome...</p>
    `}
    <div class="divider">or manually</div>
    <div class="steps">
      <div class="step"><span class="step-num">1</span><span>${step1}</span></div>
      <div class="step"><span class="step-num">2</span><span>${step2}</span></div>
    </div>
    <button class="continue" onclick="window.location.href='${url}' + (window.location.href.includes('?') ? '&' : '?') + '_skip_gate=1'">Continue anyway</button>
  </div>
  <script>
    ${isIOS ? `
    // iOS cascading fallback strategy
    function openSafari() {
      var btn = document.getElementById('openBtn');
      var url = '${url}';

      // Attempt 1: x-safari-https:// private URL scheme (iOS 15+)
      var safariUrl = url.replace(/^https:\\/\\//, 'x-safari-https://').replace(/^http:\\/\\//, 'x-safari-http://');
      window.location.href = safariUrl;

      // Attempt 2: After 1s, if still here, try navigator.share (opens share sheet)
      setTimeout(function() {
        if (navigator.share) {
          navigator.share({ title: 'Open in Safari', url: url }).catch(function() {
            copyFallback(btn, url);
          });
        } else {
          copyFallback(btn, url);
        }
      }, 1000);
    }

    // Attempt 3: Copy to clipboard as last resort
    function copyFallback(btn, url) {
      navigator.clipboard.writeText(url).then(function() {
        btn.textContent = 'Link Copied! Paste in Browser';
        btn.classList.add('copied');
      }).catch(function() {
        // Even clipboard failed — just show the manual steps
        btn.textContent = 'Copy the link above manually';
        btn.disabled = true;
      });
    }
    ` : `
    // Android: auto-redirect via fake PDF trick
    // WebView can't handle PDF → delegates to system browser → API redirects to destination
    window.location.href = '${escapeUrl}';
    `}
  </script>
</body>
</html>`;
}

/**
 * Generate a unique request ID for distributed tracing
 * Format: timestamp-random (e.g., "1704412800000-abc123")
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `${timestamp}-${random}`
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Generate request ID for tracing (use existing or create new)
  const requestId = request.headers.get('x-request-id') || generateRequestId()

  // In-app browser detection — show interstitial before anything else
  // Skip for API routes, static assets, and when user chose "continue anyway"
  if (!path.startsWith('/api/') && !path.startsWith('/egress-layout') && !request.nextUrl.searchParams.has('_skip_gate')) {
    const ua = request.headers.get('user-agent') || '';
    const inAppSource = detectInAppBrowser(ua);
    if (inAppSource) {
      const fullUrl = request.url.split('?')[0]; // strip _skip_gate if present
      const html = buildInAppBrowserPage(inAppSource, fullUrl, ua);
      return new NextResponse(html, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8', 'x-request-id': requestId },
      });
    }
  }

  // SECURITY: Block direct access to PostgREST API
  // We use Drizzle through API routes, not PostgREST
  if (path.startsWith('/rest/v1')) {
    return new NextResponse('Not Found', { status: 404 })
  }

  // Skip auth for egress layout (loaded by LiveKit headless Chrome, no cookies)
  if (path.startsWith('/egress-layout')) {
    return NextResponse.next()
  }

  // Clone request with request ID header for downstream services
  const requestWithId = new Request(request.url, {
    method: request.method,
    headers: new Headers(request.headers),
    body: request.body,
    redirect: request.redirect,
    signal: request.signal,
  })
  requestWithId.headers.set('x-request-id', requestId)

  let supabaseResponse = NextResponse.next({
    request: requestWithId,
  })

  // Add request ID to response headers for client-side debugging
  supabaseResponse.headers.set('x-request-id', requestId)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request: requestWithId,
          })
          // Preserve request ID on recreated response
          supabaseResponse.headers.set('x-request-id', requestId)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Refresh session if expired - required for Server Components
  const { data: { user } } = await supabase.auth.getUser()

  // Note: last_seen_at is updated via /api/user/heartbeat called from AuthContext
  // This ensures proper Drizzle database access instead of RLS-blocked Supabase client

  // Protect /admin routes - Admin only
  if (path.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // SECURITY: Check admin status from app_metadata (synced from DB isAdmin flag)
    // Uses SINGLE SOURCE OF TRUTH: isAdmin === true only (no legacy role check)
    const appMeta = (user.app_metadata || {}) as Record<string, unknown>;

    if (!isAdminFromClaims(appMeta)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Protect /creator routes - Creator only (except /creator/apply)
  if (path.startsWith('/creator') && path !== '/creator/apply') {
    if (!user) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // For creator routes, we'll let the page handle role checking
    // since admins can also access creator routes
  }

  // Protect general authenticated routes
  const protectedPaths = ['/dashboard', '/wallet', '/messages', '/settings', '/explore', '/content']
  const isProtectedPath = protectedPaths.some(p => path.startsWith(p))

  if (isProtectedPath && !user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
