import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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

  const path = request.nextUrl.pathname

  // Protect /admin routes - Admin only
  if (path.startsWith('/admin')) {
    console.log('[Middleware] Admin route accessed:', path)
    console.log('[Middleware] User:', user ? user.email : 'Not authenticated')

    if (!user) {
      // Not logged in, redirect to home
      console.log('[Middleware] Redirecting unauthenticated user to home')
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Check if user is admin by email (quick check without database query)
    const isAdminEmail = user.email === 'admin@digis.cc' || user.email === 'nathan@digis.cc'
    console.log('[Middleware] Is admin email:', isAdminEmail)

    if (!isAdminEmail) {
      // Not an admin email, redirect to dashboard
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
