import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { creatorLinks, users } from '@/db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';

// GET /api/creator/links - Get creator's links
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a creator
    const [profile] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!profile || profile.role !== 'creator') {
      return NextResponse.json({ error: 'Creator access required' }, { status: 403 });
    }

    // Get all links for this creator, ordered by displayOrder
    const links = await db
      .select()
      .from(creatorLinks)
      .where(eq(creatorLinks.creatorId, user.id))
      .orderBy(asc(creatorLinks.displayOrder));

    return NextResponse.json({ links });
  } catch (error) {
    console.error('[Creator Links GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 });
  }
}

// POST /api/creator/links - Create a new link
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a creator
    const [profile] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!profile || profile.role !== 'creator') {
      return NextResponse.json({ error: 'Creator access required' }, { status: 403 });
    }

    const body = await request.json();
    const { title, url, emoji } = body;

    // Validate required fields
    if (!title || !url) {
      return NextResponse.json({ error: 'Title and URL are required' }, { status: 400 });
    }

    // Validate title length
    if (typeof title !== 'string' || title.trim().length > 100) {
      return NextResponse.json({ error: 'Title must be 100 characters or less' }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Check link limit (max 8 links)
    const existingLinks = await db
      .select()
      .from(creatorLinks)
      .where(eq(creatorLinks.creatorId, user.id));

    if (existingLinks.length >= 8) {
      return NextResponse.json({ error: 'Maximum of 8 links allowed' }, { status: 400 });
    }

    // Get the next display order
    const maxOrder = existingLinks.reduce((max, link) =>
      Math.max(max, link.displayOrder), -1
    );

    // Create the link
    const [newLink] = await db
      .insert(creatorLinks)
      .values({
        creatorId: user.id,
        title: title.trim(),
        url: url.trim(),
        emoji: emoji || null,
        displayOrder: maxOrder + 1,
        isActive: true,
      })
      .returning();

    return NextResponse.json({ link: newLink });
  } catch (error) {
    console.error('[Creator Links POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create link' }, { status: 500 });
  }
}
