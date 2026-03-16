import { NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users, creatorInvites } from '@/db/schema';
import { sql, and, eq } from 'drizzle-orm';
import { withAdmin } from '@/lib/auth/withAdmin';

export const runtime = 'nodejs';

interface ParsedCreator {
  row: number;
  instagramHandle: string;
  email?: string;
  displayName?: string;
  status: 'valid' | 'duplicate_username' | 'duplicate_invite' | 'invalid';
  message?: string;
}

/**
 * POST /api/admin/onboarding/parse
 * Parse CSV content and validate creators
 */
export const POST = withAdmin(async ({ request }) => {
  try {
    const body = await request.json();
    const { csvContent } = body;

    if (!csvContent || typeof csvContent !== 'string') {
      return NextResponse.json(
        { error: 'No CSV content provided' },
        { status: 400 }
      );
    }

    // Parse CSV
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV must have a header row and at least one data row' },
        { status: 400 }
      );
    }

    // Parse header
    const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
    const instagramIdx = header.findIndex(h =>
      h.includes('instagram') || h === 'ig' || h === 'handle' || h === 'username'
    );
    const emailIdx = header.findIndex(h => h.includes('email'));
    const nameIdx = header.findIndex(h =>
      h.includes('name') || h.includes('display') || h === 'full_name'
    );

    if (instagramIdx === -1) {
      return NextResponse.json(
        { error: 'CSV must have an Instagram handle column (instagram, ig, handle, or username)' },
        { status: 400 }
      );
    }

    // Parse rows
    const parsedCreators: ParsedCreator[] = [];
    const instagramHandles: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parsing (handles quoted values)
      const values = parseCSVLine(line);

      const instagramHandle = values[instagramIdx]?.trim().replace('@', '').toLowerCase();
      if (!instagramHandle) {
        parsedCreators.push({
          row: i + 1,
          instagramHandle: '',
          status: 'invalid',
          message: 'Missing Instagram handle',
        });
        continue;
      }

      // Check for duplicates within the file
      if (instagramHandles.includes(instagramHandle)) {
        parsedCreators.push({
          row: i + 1,
          instagramHandle,
          email: emailIdx !== -1 ? values[emailIdx]?.trim() : undefined,
          displayName: nameIdx !== -1 ? values[nameIdx]?.trim() : undefined,
          status: 'invalid',
          message: 'Duplicate in file',
        });
        continue;
      }

      instagramHandles.push(instagramHandle);
      parsedCreators.push({
        row: i + 1,
        instagramHandle,
        email: emailIdx !== -1 ? values[emailIdx]?.trim() : undefined,
        displayName: nameIdx !== -1 ? values[nameIdx]?.trim() : undefined,
        status: 'valid',
      });
    }

    // Check existing usernames in database using safe parameterized queries
    if (instagramHandles.length > 0) {
      const CHUNK_SIZE = 500;
      const existingUsernames = new Set<string>();
      const existingInviteHandles = new Set<string>();

      for (let i = 0; i < instagramHandles.length; i += CHUNK_SIZE) {
        const chunk = instagramHandles.slice(i, i + CHUNK_SIZE);

        // Check for existing users with same username (parameterized)
        const existingUsers = await db
          .select({ username: users.username })
          .from(users)
          .where(sql`LOWER(${users.username}) IN (${sql.join(chunk.map(h => sql`${h}`), sql`, `)})`);

        existingUsers.forEach(u => {
          if (u.username) existingUsernames.add(u.username.toLowerCase());
        });

        // Check for existing pending invites (parameterized)
        const existingInvites = await db
          .select({ instagramHandle: creatorInvites.instagramHandle })
          .from(creatorInvites)
          .where(and(
            sql`LOWER(${creatorInvites.instagramHandle}) IN (${sql.join(chunk.map(h => sql`${h}`), sql`, `)})`,
            eq(creatorInvites.status, 'pending')
          ));

        existingInvites.forEach(inv => {
          existingInviteHandles.add(inv.instagramHandle.toLowerCase());
        });
      }

      // Update status for each creator
      parsedCreators.forEach(creator => {
        if (creator.status !== 'valid') return;

        if (existingUsernames.has(creator.instagramHandle)) {
          creator.status = 'duplicate_username';
          creator.message = 'Username already exists';
        } else if (existingInviteHandles.has(creator.instagramHandle)) {
          creator.status = 'duplicate_invite';
          creator.message = 'Pending invite already exists';
        }
      });
    }

    // Summary
    const validCount = parsedCreators.filter(c => c.status === 'valid').length;
    const duplicateUsernameCount = parsedCreators.filter(c => c.status === 'duplicate_username').length;
    const duplicateInviteCount = parsedCreators.filter(c => c.status === 'duplicate_invite').length;
    const invalidCount = parsedCreators.filter(c => c.status === 'invalid').length;

    return NextResponse.json({
      success: true,
      creators: parsedCreators,
      summary: {
        total: parsedCreators.length,
        valid: validCount,
        duplicateUsername: duplicateUsernameCount,
        duplicateInvite: duplicateInviteCount,
        invalid: invalidCount,
      },
      columns: {
        instagram: instagramIdx !== -1,
        email: emailIdx !== -1,
        name: nameIdx !== -1,
      },
    });
  } catch (error: any) {
    console.error('[ADMIN ONBOARDING PARSE] Error:', error instanceof Error ? error.stack : error);
    return NextResponse.json(
      { error: 'Failed to parse CSV' },
      { status: 500 }
    );
  }
});

// Parse a single CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}
