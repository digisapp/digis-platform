import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { validateUsername } from '@/lib/utils/username';
import { rateLimit } from '@/lib/rate-limit';
import { signupSchema, validateBody } from '@/lib/validation/schemas';
import { sendWelcomeEmail } from '@/lib/email/welcome';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { processReferralSignup, activateReferral } from '@/lib/referrals';

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
            last_seen_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('Error creating user in database:', insertError);
          // User is created in auth, this is okay - will be handled on login
        }

        // Process referral if present
        let referralProcessed = false;
        try {
          const cookieStore = await cookies();
          const referralCode = cookieStore.get('referral_code')?.value;
          if (referralCode) {
            console.log(`[Signup] Processing referral code: ${referralCode}`);
            const referralResult = await processReferralSignup(authData.user.id, referralCode);
            if (referralResult.success) {
              referralProcessed = true;
              console.log(`[Signup] Referral processed successfully: ${referralResult.referralId}`);
            } else {
              console.log(`[Signup] Referral not processed: ${referralResult.error}`);
            }
          }
        } catch (referralError) {
          console.error('[Signup] Error processing referral:', referralError);
        }

        // Check if email matches a pending creator invite (auto-claim)
        // Email match = auto-approve as creator
        try {
          // Query for pending invites matching email
          const { data: pendingInvites, error: inviteError } = await adminClient
            .from('creator_invites')
            .select('id, email, instagram_handle, status')
            .eq('status', 'pending')
            .ilike('email', email);

          if (inviteError) {
            console.log(`[Signup] Error checking invites: ${inviteError.message}`);
          }

          const pendingInvite = pendingInvites?.[0];

          if (!pendingInvite) {
            console.log(`[Signup] No pending invite found for email ${email}`);
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

              // Activate referral if this user was referred (pays bonus to referrer)
              if (referralProcessed) {
                try {
                  const activationResult = await activateReferral(authData.user.id);
                  if (activationResult.success) {
                    console.log(`[Signup] Referral activated, bonus paid: ${activationResult.bonusPaid} coins`);
                  }
                } catch (activationError) {
                  console.error('[Signup] Error activating referral:', activationError);
                }
              }

              // 🔥 CRITICAL: Update Supabase auth metadata to persist role in JWT
              // This prevents role from reverting during auth sync issues
              try {
                const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
                  authData.user.id,
                  {
                    app_metadata: { role: 'creator' },
                    user_metadata: { is_creator_verified: true },
                  }
                );
                if (authUpdateError) {
                  console.error(`[Signup] Failed to update auth metadata: ${authUpdateError.message}`);
                } else {
                  console.log(`[Signup] Auth metadata updated for creator: ${email}`);
                }
              } catch (authMetaError) {
                console.error(`[Signup] Error updating auth metadata:`, authMetaError);
              }

              // Create default creator settings (required for AI Twin, calls, etc.)
              try {
                const { error: settingsError } = await adminClient
                  .from('creator_settings')
                  .insert({
                    user_id: authData.user.id,
                    message_rate: 25,
                    call_rate_per_minute: 25,
                    minimum_call_duration: 5,
                    is_available_for_calls: false,
                    voice_call_rate_per_minute: 15,
                    minimum_voice_call_duration: 5,
                    is_available_for_voice_calls: false,
                  })
                  .select()
                  .single();

                if (settingsError && !settingsError.message?.includes('duplicate')) {
                  console.error(`[Signup] Error creating creator settings: ${settingsError.message}`);
                } else {
                  console.log(`[Signup] Creator settings created for: ${email}`);
                }
              } catch (settingsCreateError) {
                console.error(`[Signup] Error creating creator settings:`, settingsCreateError);
              }

              // Create default AI Twin settings
              try {
                const { error: aiSettingsError } = await adminClient
                  .from('ai_twin_settings')
                  .insert({
                    creator_id: authData.user.id,
                    enabled: false,
                    text_chat_enabled: false,
                    voice: 'ara',
                    price_per_minute: 20,
                    minimum_minutes: 5,
                    max_session_minutes: 60,
                    text_price_per_message: 5,
                  })
                  .select()
                  .single();

                if (aiSettingsError && !aiSettingsError.message?.includes('duplicate')) {
                  console.error(`[Signup] Error creating AI Twin settings: ${aiSettingsError.message}`);
                } else {
                  console.log(`[Signup] AI Twin settings created for: ${email}`);
                }
              } catch (aiSettingsCreateError) {
                console.error(`[Signup] Error creating AI Twin settings:`, aiSettingsCreateError);
              }

              // Send creator welcome email
              sendWelcomeEmail({
                email,
                name: displayName || username,
                username: username.toLowerCase(),
                isCreator: true,
              }).catch((err) => console.error('[Signup] Failed to send creator welcome email:', err));
            }
          } else {
            // Send fan welcome email (no invite matched)
            sendWelcomeEmail({
              email,
              name: displayName || username,
              username: username.toLowerCase(),
              isCreator: false,
            }).catch((err) => console.error('[Signup] Failed to send fan welcome email:', err));
          }
        } catch (inviteCheckError) {
          console.error(`[Signup] Error checking for invite:`, inviteCheckError);
          // Still send welcome email even if invite check failed
          sendWelcomeEmail({
            email,
            name: displayName || username,
            username: username.toLowerCase(),
            isCreator: false,
          }).catch((err) => console.error('[Signup] Failed to send welcome email:', err));
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
