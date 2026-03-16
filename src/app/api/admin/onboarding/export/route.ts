import { NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { creatorInvites } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { withAdmin } from '@/lib/auth/withAdmin';

export const runtime = 'nodejs';

/**
 * GET /api/admin/onboarding/export
 * Export invites as CSV with invite links
 */
export const GET = withAdmin(async ({ request }) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const batchId = searchParams.get('batchId');
    const format = searchParams.get('format') || 'csv';

    // Build query conditions
    const conditions = [];
    if (status && status !== 'all') {
      conditions.push(eq(creatorInvites.status, status as any));
    }
    if (batchId) {
      conditions.push(eq(creatorInvites.batchId, batchId));
    }

    // Get invites
    const invites = await db.query.creatorInvites.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: (invites, { asc }) => [asc(invites.instagramHandle)],
    });

    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://digis.cc';

    if (format === 'json') {
      return NextResponse.json({
        invites: invites.map(inv => ({
          instagramHandle: inv.instagramHandle,
          displayName: inv.displayName,
          email: inv.email,
          inviteLink: `${baseUrl}/claim/${inv.code}`,
          status: inv.status,
          createdAt: inv.createdAt,
          claimedAt: inv.claimedAt,
        })),
      });
    }

    // Generate CSV
    const csvHeader = 'instagram_handle,display_name,email,invite_link,status';
    const csvRows = invites.map(inv => {
      const inviteLink = `${baseUrl}/claim/${inv.code}`;
      return [
        inv.instagramHandle,
        inv.displayName || '',
        inv.email || '',
        inviteLink,
        inv.status,
      ].map(v => `"${(v || '').replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [csvHeader, ...csvRows].join('\n');

    // Return as downloadable CSV
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="digis-invites-${status}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('[ADMIN ONBOARDING EXPORT] Error:', error instanceof Error ? error.stack : error);
    return NextResponse.json(
      { error: 'Failed to export invites' },
      { status: 500 }
    );
  }
});
