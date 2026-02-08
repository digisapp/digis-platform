import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { rateLimitCritical } from '@/lib/rate-limit';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/user/delete-account - Self-service account deletion
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit account deletion (5/min, 30/hour)
    const rateCheck = await rateLimitCritical(user.id, 'wallet');
    if (!rateCheck.ok) {
      return NextResponse.json(
        { error: rateCheck.error },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
      );
    }

    // Get confirmation from request body
    const body = await request.json();
    const { confirmUsername } = body;

    if (!confirmUsername) {
      return NextResponse.json(
        { error: 'Please type your username to confirm deletion' },
        { status: 400 }
      );
    }

    // Get user from database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify username matches (case-insensitive)
    if (confirmUsername.toLowerCase() !== dbUser.username?.toLowerCase()) {
      return NextResponse.json(
        { error: 'Username does not match. Please type your exact username.' },
        { status: 400 }
      );
    }

    // Prevent admin self-deletion through this endpoint
    if (dbUser.isAdmin || dbUser.role === 'admin') {
      return NextResponse.json(
        { error: 'Admin accounts cannot be deleted through this method. Please contact another admin.' },
        { status: 403 }
      );
    }

    console.log('[DELETE-ACCOUNT] User requesting deletion:', dbUser.username, dbUser.email);

    // Create admin client for auth deletion
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Step 1: Delete from Supabase Auth
    console.log('[DELETE-ACCOUNT] Deleting from Supabase Auth...');
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteAuthError) {
      console.error('[DELETE-ACCOUNT] Auth deletion error:', deleteAuthError);
      // Continue with database deletion even if auth fails
    }

    // Step 2: Delete from database (cascade will handle related tables)
    console.log('[DELETE-ACCOUNT] Deleting from database...');
    await db.delete(users).where(eq(users.id, user.id));

    console.log('[DELETE-ACCOUNT] Account deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Your account has been permanently deleted',
    });
  } catch (error: unknown) {
    console.error('[DELETE-ACCOUNT] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete account';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
