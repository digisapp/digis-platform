import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Watch Live Streams & VODs | Digis',
  description: 'Watch live streams, VODs, and clips from your favorite creators on Digis. Discover new content across fitness, fashion, wellness, and more.',
  openGraph: {
    title: 'Watch Live Streams & VODs | Digis',
    description: 'Watch live streams, VODs, and clips from your favorite creators on Digis.',
    url: 'https://digis.cc/watch',
    siteName: 'Digis',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/images/digis-logo-white.png',
        width: 1200,
        height: 630,
        alt: 'Watch Live Streams on Digis',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Watch Live Streams & VODs | Digis',
    description: 'Watch live streams, VODs, and clips from your favorite creators on Digis.',
    images: ['/images/digis-logo-white.png'],
  },
};

export default function WatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
