import { Metadata } from 'next';
import { db } from '@/lib/data/system';
import { streams, users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import StreamViewerPageClient from './StreamViewerPageClient';
import { BroadcastEventJsonLd } from '@/components/seo/JsonLd';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ streamId: string }>;
};

async function getStream(streamId: string) {
  try {
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
      columns: {
        id: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        status: true,
        currentViewers: true,
        startedAt: true,
        creatorId: true,
      },
      with: {
        creator: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
    return stream;
  } catch (error) {
    console.error('Error fetching stream for metadata:', error);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { streamId } = await params;
  const stream = await getStream(streamId);

  if (!stream) {
    return {
      title: 'Stream Not Found | Digis',
      description: 'This stream could not be found on Digis.',
    };
  }

  const creatorName = stream.creator?.displayName || stream.creator?.username || 'Creator';
  const title = stream.status === 'live'
    ? `${creatorName} is LIVE: ${stream.title} | Digis`
    : `${stream.title} | Digis`;
  const description = stream.description
    ? stream.description.slice(0, 160)
    : `Watch ${creatorName} stream live on Digis - Connect through video calls, live streams, and exclusive content.`;

  const ogImage = stream.thumbnailUrl || stream.creator?.avatarUrl || 'https://digis.cc/images/digis-logo-white.png';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'video.other',
      url: `https://digis.cc/stream/${stream.id}`,
      siteName: 'Digis',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${creatorName}'s live stream`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: `https://digis.cc/stream/${stream.id}`,
    },
  };
}

export default async function StreamPage({ params }: Props) {
  const { streamId } = await params;
  const stream = await getStream(streamId);

  return (
    <>
      {stream && stream.creator && (
        <BroadcastEventJsonLd
          name={stream.title}
          description={stream.description || `Live stream by ${stream.creator.displayName || stream.creator.username}`}
          startDate={stream.startedAt?.toISOString() || new Date().toISOString()}
          isLiveBroadcast={stream.status === 'live'}
          thumbnailUrl={stream.thumbnailUrl || undefined}
          creator={{
            name: stream.creator.displayName || stream.creator.username || 'Creator',
            url: `https://digis.cc/${stream.creator.username}`,
          }}
          viewerCount={stream.currentViewers}
        />
      )}
      <StreamViewerPageClient />
    </>
  );
}
