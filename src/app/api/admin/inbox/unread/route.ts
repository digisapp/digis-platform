import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/withAdmin';
import { AdminInboxService } from '@/lib/email/admin-inbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/admin/inbox/unread — Get unread email count
export const GET = withAdmin(async () => {
  const count = await AdminInboxService.getUnreadCount();
  return NextResponse.json({ count });
});
