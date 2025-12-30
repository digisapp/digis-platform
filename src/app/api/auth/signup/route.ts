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

        // Check if email OR Instagram handle matches a pending creator invite (auto-claim)
        // Either match = auto-approve as creator
        try {
          // Query for pending invites matching email OR Instagram handle
          const { data: pendingInvites, error: inviteError } = await adminClient
            .from('creator_invites')
            .select('id, email, instagram_handle, status')
            .eq('status', 'pending')
            .or(`email.ilike.${email},instagram_handle.ilike.${username}`);

          if (inviteError) {
            console.log(`[Signup] Error checking invites: ${inviteError.message}`);
          }

          const pendingInvite = pendingInvites?.[0];

          if (!pendingInvite) {
            console.log(`[Signup] No pending invite found for email ${email} or Instagram @${username}`);
          }

          if (pendingInvite) {
            // Log which field matched
            const emailMatch = pendingInvite.email?.toLowerCase() === email.toLowerCase();
            const igMatch = pendingInvite.instagram_handle?.toLowerCase() === username.toLowerCase();
            console.log(`[Signup] Found pending invite - Email match: ${emailMatch}, Instagram match: ${igMatch}`, pendingInvite);

            // Mark invite as claimed
            const { error: claimError } = await adminClient
              .from('creator_invites')
              .update({
                status: 'claimed',
                claimed_by: authData.user.id,
                claimed_at: new Date().toISOString(),
              })
              .eq('id', pendingInvite.id);

            if (claimError) {
              console.error(`[Signup] Error claiming invite: ${claimError.message}`);
            }

            // Auto-upgrade user to creator
            const { error: upgradeError } = await adminClient
              .from('users')
              .update({ role: 'creator', is_creator_verified: true })
              .eq('id', authData.user.id);

            if (upgradeError) {
              console.error(`[Signup] Error upgrading to creator: ${upgradeError.message}`);
            } else {
              console.log(`[Signup] Auto-claimed invite and upgraded to creator: ${email}`);
            }
          }
        } catch (inviteCheckError) {
          console.error(`[Signup] Error checking for invite:`, inviteCheckError);
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
