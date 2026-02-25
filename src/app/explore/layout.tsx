import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore Creators | Digis',
  description: 'Discover top creators on Digis. Browse live streams, trending creators in fitness, fashion, wellness, and more.',
  openGraph: {
    title: 'Explore Creators | Digis',
    description: 'Discover top creators on Digis. Browse live streams, trending creators in fitness, fashion, wellness, and more.',
    url: 'https://digis.cc/explore',
    siteName: 'Digis',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/images/digis-logo-white.png',
        width: 1200,
        height: 630,
        alt: 'Explore Creators on Digis',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Explore Creators | Digis',
    description: 'Discover top creators on Digis. Browse live streams, trending creators in fitness, fashion, wellness, and more.',
    images: ['/images/digis-logo-white.png'],
  },
};

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
