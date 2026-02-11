import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/data/system';
import { vods } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import VODPlayerPageClient from './VODPlayerPageClient';
import { VideoObjectJsonLd, secondsToIsoDuration } from '@/components/seo/JsonLd';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ vodId: string }>;
};

async function getVod(vodId: string) {
  try {
    const vod = await db.query.vods.findFirst({
      where: eq(vods.id, vodId),
      columns: {
        id: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        videoUrl: true,
        duration: true,
        viewCount: true,
        priceCoins: true,
        isPublic: true,
        createdAt: true,
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
    return vod;
  } catch (error) {
    console.error('Error fetching VOD for metadata:', error);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { vodId } = await params;
  const vod = await getVod(vodId);

  if (!vod) {
    return {
      title: 'VOD Not Found | Digis',
      description: 'This video could not be found on Digis.',
    };
  }

  const creatorName = vod.creator?.displayName || vod.creator?.username || 'Creator';
  const title = `${vod.title} | ${creatorName} | Digis`;
  const description = vod.description
    ? vod.description.slice(0, 160)
    : `Watch ${vod.title} by ${creatorName} on Digis.${vod.isPublic ? '' : ` ${vod.priceCoins} coins.`}`;

  const ogImage = vod.thumbnailUrl || vod.creator?.avatarUrl || 'https://digis.cc/images/digis-logo-white.png';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'video.other',
      url: `https://digis.cc/vod/${vod.id}`,
      siteName: 'Digis',
      images: [
        {
          url: ogImage,
          width: 1280,
          height: 720,
          alt: vod.title,
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
      canonical: `https://digis.cc/vod/${vod.id}`,
    },
  };
}

export default async function VODPage({ params }: Props) {
  const { vodId } = await params;
  const vod = await getVod(vodId);

  if (!vod) notFound();

  return (
    <>
      {vod && vod.creator && (
        <VideoObjectJsonLd
          name={vod.title}
          description={vod.description || `Video by ${vod.creator.displayName || vod.creator.username}`}
          thumbnailUrl={vod.thumbnailUrl || undefined}
          uploadDate={vod.createdAt.toISOString()}
          duration={vod.duration ? secondsToIsoDuration(vod.duration) : undefined}
          contentUrl={vod.isPublic ? vod.videoUrl || undefined : undefined}
          creator={{
            name: vod.creator.displayName || vod.creator.username || 'Creator',
            url: `https://digis.cc/${vod.creator.username}`,
          }}
          interactionCount={vod.viewCount}
        />
      )}
      <VODPlayerPageClient />
    </>
  );
}
