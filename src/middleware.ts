import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // SECURITY: Block direct access to PostgREST API
  // We use Drizzle through API routes, not PostgREST
  if (path.startsWith('/rest/v1')) {
    console.log('[Security] Blocked PostgREST access attempt:', path)
    return new NextResponse('Not Found', { status: 404 })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Refresh session if expired - required for Server Components
  const { data: { user } } = await supabase.auth.getUser()

  // Protect /admin routes - Admin only
  if (path.startsWith('/admin')) {
    console.log('[Middleware] Admin route accessed:', path)
    console.log('[Middleware] User:', user ? user.email : 'Not authenticated')

    if (!user) {
      // Not logged in, redirect to home
      console.log('[Middleware] Redirecting unauthenticated user to home')
      return NextResponse.redirect(new URL('/', request.url))
    }

    // SECURITY: Check admin status from app_metadata (synced from DB isAdmin flag)
    // No hardcoded email lists - DB is the only source of truth
    // app_metadata is set by server when user.isAdmin changes in DB
    const appMeta = user.app_metadata || {}
    const isAdmin = appMeta.isAdmin === true || appMeta.role === 'admin'
    console.log('[Middleware] Is admin (from app_metadata):', isAdmin)

    if (!isAdmin) {
      // Not an admin, redirect to dashboard
      console.log('[Middleware] Redirecting non-admin user to dashboard')
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    console.log('[Middleware] Admin access granted')
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
