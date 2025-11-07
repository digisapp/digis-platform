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

    // Get or create user in database with fallback
    let dbUser;
    let dbError = null;

    try {
      dbUser = await db.query.users.findFirst({
        where: eq(users.id, data.user.id),
      });

      // If user doesn't exist in database, create it
      if (!dbUser) {
        try {
          const username = data.user.user_metadata?.username || `user_${data.user.id.substring(0, 8)}`;

          const [newUser] = await db.insert(users).values({
            id: data.user.id,
            email: data.user.email!,
            displayName: data.user.user_metadata?.display_name || email.split('@')[0],
            username: username.toLowerCase(),
            role: 'fan',
          }).returning();

          dbUser = newUser;
        } catch (insertError) {
          console.error('Error creating user in database:', insertError);
          // Try to query again in case of race condition
          dbUser = await db.query.users.findFirst({
            where: eq(users.id, data.user.id),
          });
        }
      }
    } catch (queryError) {
      console.error('Database error - allowing login anyway:', queryError);
      dbError = queryError;
      // Allow login to proceed even if database fails
      // This prevents users from being locked out due to database issues
    }

    // Determine role with fallback logic
    let userRole = dbUser?.role || 'fan';
    if (!dbUser) {
      // Check if admin email
      const isAdminEmail = data.user.email === 'admin@digis.cc' || data.user.email === 'nathan@digis.cc';
      userRole = data.user.user_metadata?.role || (isAdminEmail ? 'admin' : 'fan');
    }

    // Return response with user role
    return NextResponse.json({
      user: {
        ...data.user,
        role: userRole,
      },
      session: data.session,
      message: dbError ? 'Login successful (limited features - database error)' : 'Login successful!',
    });
  } catch (error) {
    console.error('Login error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
    });
    return NextResponse.json(
      {
        error: 'An error occurred during login',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}
