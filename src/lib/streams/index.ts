import { db } from '@/lib/data/system';
import { users, streams } from '@/lib/data/system';
import { eq, and } from 'drizzle-orm';

export interface StreamInfo {
  id: string;
  status: 'live' | 'scheduled' | 'ended';
  kind: 'public' | 'private_group' | 'members_only' | 'private_1on1';
  priceCents: number | null;
  startsAt: string | null;
  creatorId: string;
}

export async function getCreatorByUsername(username: string) {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
      columns: {
        id: true,
        username: true,
        role: true,
      },
    });

    return user?.role === 'creator' ? user : null;
  } catch (error) {
    console.error('[getCreatorByUsername] Error:', error);
    return null;
  }
}

export async function getCurrentStreamForCreator(creatorId: string): Promise<StreamInfo | null> {
  try {
    // Check for live stream first
    const liveStream = await db.query.streams.findFirst({
      where: and(
        eq(streams.creatorId, creatorId),
        eq(streams.status, 'live')
      ),
      columns: {
        id: true,
        status: true,
        title: true,
        privacy: true,
        startedAt: true,
        scheduledFor: true,
        creatorId: true,
      },
    });

    if (liveStream) {
      // Map privacy to kind
      let kind: StreamInfo['kind'] = 'public';
      if (liveStream.privacy === 'private') {
        kind = 'private_group';
      } else if (liveStream.privacy === 'followers') {
        kind = 'members_only';
      }

      return {
        id: liveStream.id,
        status: liveStream.status as 'live' | 'scheduled' | 'ended',
        kind,
        priceCents: null, // Streams don't have direct pricing, only shows do
        startsAt: liveStream.startedAt?.toISOString() ?? liveStream.scheduledFor?.toISOString() ?? null,
        creatorId: liveStream.creatorId,
      };
    }

    // Check for scheduled streams
    const scheduledStream = await db.query.streams.findFirst({
      where: and(
        eq(streams.creatorId, creatorId),
        eq(streams.status, 'scheduled')
      ),
      columns: {
        id: true,
        status: true,
        title: true,
        privacy: true,
        startedAt: true,
        scheduledFor: true,
        creatorId: true,
      },
    });

    if (scheduledStream) {
      let kind: StreamInfo['kind'] = 'public';
      if (scheduledStream.privacy === 'private') {
        kind = 'private_group';
      } else if (scheduledStream.privacy === 'followers') {
        kind = 'members_only';
      }

      return {
        id: scheduledStream.id,
        status: 'scheduled',
        kind,
        priceCents: null,
        startsAt: scheduledStream.scheduledFor?.toISOString() ?? null,
        creatorId: scheduledStream.creatorId,
      };
    }

    // No live or upcoming streams
    return null;
  } catch (error) {
    console.error('[getCurrentStreamForCreator] Error:', error);
    return null;
  }
}

export async function hasAccess({
  userId,
  stream
}: {
  userId: string | null;
  stream: StreamInfo;
}): Promise<boolean> {
  try {
    // Public streams are always accessible
    if (stream.kind === 'public') {
      return true;
    }

    // Must be logged in for private streams
    if (!userId) {
      return false;
    }

    // Creator always has access to their own stream
    if (userId === stream.creatorId) {
      return true;
    }

    // For followers-only streams, check if user follows the creator
    if (stream.kind === 'members_only') {
      // TODO: Check if user follows creator
      // For now, return false - can be enhanced later
      return false;
    }

    // For private streams, for now allow any logged-in user
    // TODO: Add proper access control (tickets, subscription, etc.)
    if (stream.kind === 'private_group' || stream.kind === 'private_1on1') {
      // This can be enhanced with a tickets system later
      return false;
    }

    return false;
  } catch (error) {
    console.error('[hasAccess] Error:', error);
    return false;
  }
}
