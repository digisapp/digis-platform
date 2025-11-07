import { NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const allUsers = await db.query.users.findMany({
      columns: {
        username: true,
        email: true,
        createdAt: true,
      },
      limit: 20,
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    });

    return NextResponse.json({
      count: allUsers.length,
      users: allUsers,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
