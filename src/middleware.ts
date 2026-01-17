import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  // SECURITY: Block direct access to PostgREST API
  // We use Drizzle through API routes, not PostgREST
  if (path.startsWith('/rest/v1')) {
    return new NextResponse('Not Found', { status: 404 })
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
    const appMeta = user.app_metadata || {}
    const isAdmin = appMeta.isAdmin === true || appMeta.role === 'admin'

    if (!isAdmin) {
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
