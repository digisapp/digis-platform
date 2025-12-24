import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { validateUsername } from '@/lib/utils/username';
import { rateLimit } from '@/lib/rate-limit';
import { signupSchema, validateBody } from '@/lib/validation/schemas';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Rate limit signup attempts (3/min per IP)
    const rl = await rateLimit(request, 'auth:signup');
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again in a minute.' },
        { status: 429, headers: rl.headers }
      );
    }

    // Validate input with Zod
    const validation = await validateBody(request, signupSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { email, password, displayName, username } = validation.data;

    // Additional username validation (reserved words, etc.)
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

        // Check if this email matches a pending creator invite (auto-claim)
        try {
          const { data: pendingInvite } = await adminClient
            .from('creator_invites')
            .select('id')
            .eq('status', 'pending')
            .ilike('email', email)
            .single();

          if (pendingInvite) {
            // Mark invite as claimed
            await adminClient
              .from('creator_invites')
              .update({
                status: 'claimed',
                claimed_by: authData.user.id,
                claimed_at: new Date().toISOString(),
              })
              .eq('id', pendingInvite.id);

            // Auto-upgrade user to creator
            await adminClient
              .from('users')
              .update({ role: 'creator' })
              .eq('id', authData.user.id);

            console.log(`[Signup] Auto-claimed invite and upgraded to creator: ${email}`);
          }
        } catch {
          // No matching invite or error - ignore silently
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
      {
        error: 'An error occurred during signup',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
