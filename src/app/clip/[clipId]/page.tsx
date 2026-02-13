import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/data/system';
import { clips } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import ClipPlayerPageClient from './ClipPlayerPageClient';
import { VideoObjectJsonLd, BreadcrumbJsonLd, secondsToIsoDuration } from '@/components/seo/JsonLd';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ clipId: string }>;
};

async function getClip(clipId: string) {
  try {
    const clip = await db.query.clips.findFirst({
      where: eq(clips.id, clipId),
      columns: {
        id: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        videoUrl: true,
        duration: true,
        viewCount: true,
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
    return clip;
  } catch (error) {
    console.error('Error fetching clip for metadata:', error);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clipId } = await params;
  const clip = await getClip(clipId);

  if (!clip) {
    return {
      title: 'Clip Not Found | Digis',
      description: 'This clip could not be found on Digis.',
    };
  }

  const creatorName = clip.creator?.displayName || clip.creator?.username || 'Creator';
  const title = `${clip.title} | Clip by ${creatorName} | Digis`;
  const description = clip.description
    ? clip.description.slice(0, 160)
    : `Watch this highlight clip from ${creatorName} on Digis - Free to watch!`;

  const ogImage = clip.thumbnailUrl || clip.creator?.avatarUrl || 'https://digis.cc/images/digis-logo-white.png';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'video.other',
      url: `https://digis.cc/clip/${clip.id}`,
      siteName: 'Digis',
      images: [
        {
          url: ogImage,
          width: 1280,
          height: 720,
          alt: clip.title,
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
      canonical: `https://digis.cc/clip/${clip.id}`,
    },
  };
}

export default async function ClipPage({ params }: Props) {
  const { clipId } = await params;
  const clip = await getClip(clipId);

  if (!clip) notFound();

  return (
    <>
      {clip && clip.creator && (
        <BreadcrumbJsonLd
          items={[
            { name: 'Home', url: 'https://digis.cc' },
            { name: clip.creator.displayName || clip.creator.username || 'Creator', url: `https://digis.cc/${clip.creator.username}` },
            { name: clip.title, url: `https://digis.cc/clip/${clip.id}` },
          ]}
        />
      )}
      {clip && clip.creator && (
        <VideoObjectJsonLd
          name={clip.title}
          description={clip.description || `Clip by ${clip.creator.displayName || clip.creator.username}`}
          thumbnailUrl={clip.thumbnailUrl || undefined}
          uploadDate={clip.createdAt.toISOString()}
          duration={secondsToIsoDuration(clip.duration)}
          contentUrl={clip.videoUrl || undefined}
          creator={{
            name: clip.creator.displayName || clip.creator.username || 'Creator',
            url: `https://digis.cc/${clip.creator.username}`,
          }}
          interactionCount={clip.viewCount}
        />
      )}
      <ClipPlayerPageClient />
    </>
  );
}
