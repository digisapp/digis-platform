import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { validateUsername } from '@/lib/utils/username';

export async function POST(request: NextRequest) {
  try {
    const { email, password, displayName, username } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Validate username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return NextResponse.json(
        { error: usernameValidation.error },
        { status: 400 }
      );
    }

    // Check if username is already taken using Supabase client
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: existingUser } = await adminClient
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0],
          username: username.toLowerCase(),
        },
      },
    });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    // Create user in database using Supabase client
    if (authData.user) {
      try {
        const { error: insertError } = await adminClient
          .from('users')
          .insert({
            id: authData.user.id,
            email: authData.user.email!,
            username: username.toLowerCase(),
            display_name: displayName || email.split('@')[0],
            role: 'fan',
          });

        if (insertError) {
          console.error('Error creating user in database:', insertError);
          // User is created in auth, this is okay - will be handled on login
        }
      } catch (dbError) {
        console.error('Error creating user in database:', dbError);
        // User is created in auth, this is okay - will be handled on login
      }
    }

    return NextResponse.json({
      user: authData.user,
      message: 'Signup successful! Please check your email to verify your account.',
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'An error occurred during signup' },
      { status: 500 }
    );
  }
}
