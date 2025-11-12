import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const supabase = await createClient();
    // Touch and refresh session if needed
    const { data: { session } } = await supabase.auth.getSession();

    const res = NextResponse.json({
      ok: true,
      authenticated: !!session
    });

    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (error) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
