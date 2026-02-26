import { MetadataRoute } from 'next';
import { db } from '@/lib/data/system';
import { users, streams, vods, clips } from '@/lib/data/system';
import { eq, and, desc } from 'drizzle-orm';

const BASE_URL = 'https://digis.cc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // Static pages
  entries.push(
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/explore`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/live`,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/for-creators`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/become-creator`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/streams`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    }
  );

  try {
    // Fetch verified creators for profile pages
    const creators = await db.query.users.findMany({
      where: eq(users.isCreatorVerified, true),
      columns: {
        username: true,
        updatedAt: true,
      },
      limit: 5000,
    });

    for (const creator of creators) {
      if (creator.username) {
        entries.push({
          url: `${BASE_URL}/${creator.username}`,
          lastModified: creator.updatedAt || new Date(),
          changeFrequency: 'daily',
          priority: 0.8,
        });
      }
    }

    // Fetch live streams
    const liveStreams = await db.query.streams.findMany({
      where: eq(streams.status, 'live'),
      columns: {
        id: true,
        startedAt: true,
      },
      limit: 500,
    });

    for (const stream of liveStreams) {
      entries.push({
        url: `${BASE_URL}/stream/${stream.id}`,
        lastModified: stream.startedAt || new Date(),
        changeFrequency: 'always',
        priority: 0.9,
      });
    }

    // Fetch public VODs
    const publicVods = await db.query.vods.findMany({
      where: and(
        eq(vods.isPublic, true),
        eq(vods.isDraft, false)
      ),
      columns: {
        id: true,
        updatedAt: true,
      },
      orderBy: desc(vods.createdAt),
      limit: 2000,
    });

    for (const vod of publicVods) {
      entries.push({
        url: `${BASE_URL}/vod/${vod.id}`,
        lastModified: vod.updatedAt || new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }

    // Fetch public clips
    const publicClips = await db.query.clips.findMany({
      where: eq(clips.isPublic, true),
      columns: {
        id: true,
        updatedAt: true,
      },
      orderBy: desc(clips.createdAt),
      limit: 2000,
    });

    for (const clip of publicClips) {
      entries.push({
        url: `${BASE_URL}/clip/${clip.id}`,
        lastModified: clip.updatedAt || new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  } catch (error) {
    console.error('Error generating sitemap:', error);
  }

  return entries;
}
