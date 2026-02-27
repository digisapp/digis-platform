import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resetPasswordSchema, validateBody } from '@/lib/validation/schemas';
import { rateLimit } from '@/lib/rate-limit';
import * as Sentry from '@sentry/nextjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/auth/reset-password - Request password reset email
export async function POST(request: NextRequest) {
  try {
    // Rate limit password reset requests
    const rl = await rateLimit(request, 'auth');
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rl.headers }
      );
    }

    // Validate input
    const validation = await validateBody(request, resetPasswordSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { email } = validation.data;
    const supabase = await createClient();

    // Send password reset email via Supabase Auth
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_URL || 'https://digis.cc'}/reset-password`,
    });

    if (error) {
      console.error('Password reset error:', error);
      // Don't reveal if email exists or not for security
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
    });
  } catch (error) {
    console.error('Password reset error:', error);
    Sentry.captureException(error, {
      tags: { service: 'auth', route: 'POST /api/auth/reset-password' },
    });
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
