import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to Use Digis - Creator Guide',
  description: 'Learn how to monetize your Instagram and TikTok following with Digis. Real-life scenarios for fitness, yoga, fashion, lifestyle, and model creators to earn through live streams, video calls, subscriptions, and more.',
  keywords: [
    'creator monetization',
    'instagram monetization',
    'tiktok monetization',
    'influencer income',
    'fitness creator',
    'yoga instructor online',
    'fashion influencer',
    'model income',
    'live streaming platform',
    'video call monetization',
    'subscription content',
    'creator economy',
  ],
  openGraph: {
    title: 'How to Use Digis - Turn Your Following Into Income',
    description: 'See exactly how creators are using Digis to monetize their audience with live streams, video calls, subscriptions, AI twins, and more.',
    url: 'https://digis.cc/for-creators',
    siteName: 'Digis',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/images/digis-logo-white.png',
        width: 1200,
        height: 630,
        alt: 'Digis Creator Guide',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to Use Digis - Creator Guide',
    description: 'Learn how to monetize your following with live streams, video calls, subscriptions, and more.',
    images: ['/images/digis-logo-white.png'],
  },
};

export default function ForCreatorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
