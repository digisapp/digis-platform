import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force Node.js runtime and disable all caching
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST() {
  try {
    const supabase = await createClient();
    // Touch and refresh session if needed
    const { data: { session } } = await supabase.auth.getSession();

    const res = NextResponse.json({
      ok: true,
      authenticated: !!session
    });

    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    res.headers.set('Vary', 'Cookie'); // Prevent proxies from mixing users
    return res;
  } catch (error) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
