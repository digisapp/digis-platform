import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { calls } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const { callId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the call
    const call = await db.query.calls.findFirst({
      where: eq(calls.id, callId),
      with: {
        fan: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        creator: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // Verify user is part of the call
    if (call.fanId !== user.id && call.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'You are not part of this call' },
        { status: 403 }
      );
    }

    return NextResponse.json({ call });
  } catch (error: any) {
    console.error('Error fetching call:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch call' },
      { status: 500 }
    );
  }
}
