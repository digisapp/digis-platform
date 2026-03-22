import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/withAdmin';
import { AdminInboxService } from '@/lib/email/admin-inbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withAdmin(async ({ request }) => {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });
  const value = await AdminInboxService.getSettings(key);
  return NextResponse.json({ key, value });
});

export const PUT = withAdmin(async ({ request }) => {
  const body = await request.json();
  const { key, value } = body;
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });
  await AdminInboxService.setSettings(key, JSON.stringify(value));
  return NextResponse.json({ success: true });
});
