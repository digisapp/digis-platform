import { Metadata } from 'next';
import { FAQPageJsonLd } from '@/components/seo/JsonLd';

const FAQ_ITEMS = [
  {
    question: 'How much does it cost to join Digis?',
    answer: 'Digis is completely free to join. There are no monthly fees or upfront costs. You keep 100% of your earnings.',
  },
  {
    question: 'How do creators make money on Digis?',
    answer: 'Creators earn through paid DMs, 1-on-1 video calls, live streaming tips and gifts, monthly subscriptions, tip menus, and an AI Twin that earns while you sleep.',
  },
  {
    question: 'What is the AI Twin feature?',
    answer: 'AI Twin is an AI that talks like you, answers DMs 24/7, does voice chats, and remembers every fan. It earns money on your behalf even when you are offline.',
  },
  {
    question: 'What types of creators is Digis for?',
    answer: 'Digis is built for fitness creators, fashion influencers, wellness coaches, yoga instructors, models, and any content creator on Instagram or TikTok looking to monetize their following.',
  },
  {
    question: 'How does the creator referral program work?',
    answer: 'When you refer another creator to Digis, you earn 5% of their income for an entire year. If they make $3,000 per month, you earn $150 per month.',
  },
];

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
  return (
    <>
      <FAQPageJsonLd questions={FAQ_ITEMS} />
      {children}
    </>
  );
}
