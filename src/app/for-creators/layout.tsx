import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Turn Your Following Into Real Income | Digis',
  description: 'Stop posting for free. Digis helps Instagram & TikTok creators earn through paid DMs, video calls, live streams, subscriptions, and AI that talks like you 24/7.',
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
    'paid dms',
    'ai twin',
  ],
  openGraph: {
    title: 'Turn Your Following Into Real Income | Digis',
    description: 'No weird corporate stuff. Just you, your vibe, your fans — paid. 10+ ways to earn, AI that talks like you 24/7, 100% creator payout.',
    url: 'https://digis.cc/for-creators',
    siteName: 'Digis',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/images/digis-logo-white.png',
        width: 1200,
        height: 630,
        alt: 'Digis - Turn Your Following Into Real Income',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Turn Your Following Into Real Income | Digis',
    description: 'Stop posting for free. Paid DMs, video calls, live streams, subscriptions, and AI that earns while you sleep.',
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
