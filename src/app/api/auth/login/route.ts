import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
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

    // 3) Determine role - PRIORITIZE DB, then auth metadata, NEVER force "fan" on timeout
    const isAdminEmail = authUser.email === 'admin@digis.cc' || authUser.email === 'nathan@digis.cc';

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
