import { Metadata } from 'next';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { sql } from 'drizzle-orm';
import ProfilePageClient from './ProfilePageClient';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ username: string }>;
};

async function getUser(username: string) {
  try {
    const user = await db.query.users.findFirst({
      where: sql`lower(${users.username}) = lower(${username})`,
      columns: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        role: true,
        isCreatorVerified: true,
      },
    });
    return user;
  } catch (error) {
    console.error('Error fetching user for metadata:', error);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const user = await getUser(username);

  if (!user) {
    return {
      title: 'Profile Not Found | Digis',
      description: 'This profile could not be found on Digis.',
    };
  }

  const displayName = user.displayName || user.username;
  const title = `${displayName} Live on Digis`;
  const description = user.bio
    ? user.bio.slice(0, 160)
    : `Check out ${displayName}'s profile on Digis - Connect through video calls, live streams, and exclusive content.`;

  // Use avatar as OG image, fallback to logo
  const ogImage = user.avatarUrl || 'https://digis.cc/images/digis-logo-white.png';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      url: `https://digis.cc/${user.username}`,
      siteName: 'Digis',
      images: [
        {
          url: ogImage,
          width: 400,
          height: 400,
          alt: `${displayName}'s profile picture`,
        },
      ],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default function ProfilePage() {
  return <ProfilePageClient />;
}
