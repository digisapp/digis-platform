import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Rate limit login attempts (5/min per IP)
    const rl = await rateLimit(request, 'auth:login');
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again in a minute.' },
        { status: 429, headers: rl.headers }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1) Supabase sign in - this is the source of truth for auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    const authUser = data.user;
    const metadata = authUser.user_metadata || {};

    // 2) Try to fetch DB user, but NEVER downgrade role if it fails
    let dbUser: any = null;

    try {
      const dbQueryPromise = db.query.users.findFirst({
        where: eq(users.id, authUser.id),
      });

      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Database query timeout')), 15000)
      );

      dbUser = await Promise.race([dbQueryPromise, timeoutPromise]);
    } catch (queryError) {
      console.warn('[LOGIN] DB lookup failed or timed out, using auth metadata only', queryError);
      // Don't fail login - just use metadata
    }

    // 3) Check if user should be admin based on ADMIN_EMAILS env var
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const isAdminEmail = authUser.email && adminEmails.includes(authUser.email.toLowerCase());

    // If user is in ADMIN_EMAILS but not admin in DB, promote them
    if (isAdminEmail && dbUser && dbUser.role !== 'admin') {
      try {
        await db.update(users).set({ role: 'admin' }).where(eq(users.id, authUser.id));
        dbUser.role = 'admin';
        console.log(`[LOGIN] Promoted ${authUser.email} to admin role`);
      } catch (e) {
        console.warn('[LOGIN] Failed to promote admin:', e);
      }
    }

    // Priority: DB role > metadata role > admin email check > null (let client decide)
    const role = dbUser?.role || metadata.role || (isAdminEmail ? 'admin' : null);

    const username = dbUser?.username || metadata.username || authUser.email?.split('@')[0];

    // Build response user object
    const responseUser = {
      id: authUser.id,
      email: authUser.email,
      username,
      displayName: dbUser?.displayName || metadata.display_name || username,
      role, // Can be null if we couldn't determine - client will handle
      isCreatorVerified: dbUser?.isCreatorVerified ?? !!metadata.isCreatorVerified,
      avatarUrl: dbUser?.avatarUrl || metadata.avatar_url || null,
    };

    // Update user_metadata with role if we found it in DB (for future fast lookups)
    if (dbUser?.role && dbUser.role !== metadata.role) {
      try {
        await supabase.auth.updateUser({
          data: { role: dbUser.role }
        });
      } catch (e) {
        console.warn('[LOGIN] Failed to sync role to metadata', e);
      }
    }

    return NextResponse.json({
      user: responseUser,
      session: data.session,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        error: 'An error occurred during login',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}
