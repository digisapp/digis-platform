import { NextResponse } from 'next/server';
import { withAdminParams } from '@/lib/auth/withAdmin';
import { AdminInboxService } from '@/lib/email/admin-inbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/admin/inbox/[id] — Get single email + thread
export const GET = withAdminParams<{ id: string }>(async ({ params }) => {
  const { id } = await params;

  const email = await AdminInboxService.getEmail(id);
  if (!email) {
    return NextResponse.json({ error: 'Email not found' }, { status: 404 });
  }

  // Get the full thread if threadId exists
  let thread: Awaited<ReturnType<typeof AdminInboxService.getThread>> = [];
  if (email.threadId) {
    thread = await AdminInboxService.getThread(email.threadId);
  }

  return NextResponse.json({ email, thread });
});

// PATCH /api/admin/inbox/[id] — Update email (read, star, spam)
export const PATCH = withAdminParams<{ id: string }>(async ({ params, request }) => {
  const { id } = await params;
  const body = await request.json();

  if (body.isRead !== undefined) {
    await AdminInboxService.markRead(id, body.isRead);
  }
  if (body.isStarred !== undefined) {
    await AdminInboxService.toggleStar(id);
  }
  if (body.isSpam !== undefined) {
    await AdminInboxService.markSpam(id, body.isSpam);
  }

  return NextResponse.json({ success: true });
});

// DELETE /api/admin/inbox/[id] — Delete email
export const DELETE = withAdminParams<{ id: string }>(async ({ params }) => {
  const { id } = await params;
  await AdminInboxService.deleteEmail(id);
  return NextResponse.json({ success: true });
});
