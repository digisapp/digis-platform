import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/withAdmin';
import { AdminInboxService } from '@/lib/email/admin-inbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/admin/inbox — List emails
export const GET = withAdmin(async ({ request }) => {
  const url = new URL(request.url);
  const direction = url.searchParams.get('direction') as 'inbound' | 'outbound' | null;
  const search = url.searchParams.get('search') || '';
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);
  const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
  const includeSpam = url.searchParams.get('includeSpam') === 'true';

  const result = await AdminInboxService.listEmails({
    direction: direction || undefined,
    search: search || undefined,
    page,
    limit: Math.min(limit, 50),
    unreadOnly,
    includeSpam,
  });

  return NextResponse.json(result);
});

// POST /api/admin/inbox — Send/compose email
export const POST = withAdmin(async ({ request }) => {
  const body = await request.json();
  const { to, subject, bodyHtml, bodyText, replyToEmailId } = body;

  if (!to || !subject || (!bodyHtml && !bodyText)) {
    return NextResponse.json({ error: 'Missing required fields: to, subject, and body' }, { status: 400 });
  }

  const result = await AdminInboxService.sendNewEmail({
    to,
    subject,
    bodyHtml: bodyHtml || `<p>${bodyText}</p>`,
    bodyText: bodyText || '',
    replyToEmailId,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: result.id });
});

// PUT /api/admin/inbox — Bulk actions (e.g. mark read)
export const PUT = withAdmin(async ({ request }) => {
  const body = await request.json();
  const { ids, action } = body;
  if (!ids || !Array.isArray(ids)) {
    return NextResponse.json({ error: 'ids array required' }, { status: 400 });
  }
  if (action === 'markRead') {
    await AdminInboxService.bulkMarkRead(ids);
  }
  return NextResponse.json({ success: true });
});

// DELETE /api/admin/inbox — Bulk delete
export const DELETE = withAdmin(async ({ request }) => {
  const body = await request.json();
  const { ids } = body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids array required' }, { status: 400 });
  }
  await AdminInboxService.bulkDelete(ids);
  return NextResponse.json({ success: true, deleted: ids.length });
});
