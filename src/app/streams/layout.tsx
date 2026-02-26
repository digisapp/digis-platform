import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Streams - Live, Schedule & Replays | Digis',
  description: 'Watch live streams, scheduled shows, and replays from your favorite creators on Digis. Discover new content across fitness, fashion, wellness, and more.',
  openGraph: {
    title: 'Streams - Live, Schedule & Replays | Digis',
    description: 'Watch live streams, scheduled shows, and replays from your favorite creators on Digis.',
    url: 'https://digis.cc/streams',
    siteName: 'Digis',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/images/digis-logo-white.png',
        width: 1200,
        height: 630,
        alt: 'Streams on Digis',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Streams - Live, Schedule & Replays | Digis',
    description: 'Watch live streams, scheduled shows, and replays from your favorite creators on Digis.',
    images: ['/images/digis-logo-white.png'],
  },
};

export default function StreamsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
