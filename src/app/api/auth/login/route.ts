import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

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

    // Get or create user in database
    let dbUser = await db.query.users.findFirst({
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
        // User exists in auth but not in DB - this is ok, query again
        dbUser = await db.query.users.findFirst({
          where: eq(users.id, data.user.id),
        });

        if (!dbUser) {
          throw new Error('Failed to create or find user in database');
        }
      }
    }

    // Return response with user role
    return NextResponse.json({
      user: {
        ...data.user,
        role: dbUser?.role || 'fan',
      },
      session: data.session,
      message: 'Login successful!',
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
