import { Metadata } from 'next';
import { FAQPageJsonLd } from '@/components/seo/JsonLd';

const FAQ_ITEMS = [
  {
    question: 'What is Digis?',
    answer: 'Digis is a live creator platform where creators earn through video calls, voice calls, live streams, paid DMs, subscriptions, tips, and an AI Twin that earns 24/7.',
  },
  {
    question: 'How do I become a creator on Digis?',
    answer: 'Apply to become a creator on Digis by filling out a short application. Once approved, you can set up your profile and start earning immediately.',
  },
  {
    question: 'How much does it cost to join Digis?',
    answer: 'Digis is completely free to join. There are no monthly fees or upfront costs. Creators keep 100% of their earnings.',
  },
  {
    question: 'How do creators earn money on Digis?',
    answer: 'Creators earn through 10+ monetization tools: 1-on-1 video calls, voice calls, live streaming with tips and gifts, paid DMs, monthly subscriptions, tip menus, exclusive content, and an AI Twin that chats with fans 24/7.',
  },
  {
    question: 'What is the AI Twin feature?',
    answer: 'AI Twin is an AI that talks like you, answers DMs 24/7, does voice chats, and remembers every fan. It earns money on your behalf even when you are offline.',
  },
];

export const metadata: Metadata = {
  title: 'Become a Creator | Digis',
  description: 'Join Digis and start earning through video calls, live streams, paid DMs, subscriptions, and AI Twin. Free to join, 100% creator payout.',
  keywords: [
    'become a creator',
    'creator monetization',
    'instagram monetization',
    'tiktok monetization',
    'influencer income',
    'live streaming platform',
    'video call monetization',
    'paid dms',
    'ai twin',
    'creator economy',
  ],
  openGraph: {
    title: 'Become a Creator | Digis',
    description: 'Join Digis and start earning through video calls, live streams, paid DMs, subscriptions, and AI Twin. Free to join.',
    url: 'https://digis.cc/become-creator',
    siteName: 'Digis',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/images/digis-logo-white.png',
        width: 1200,
        height: 630,
        alt: 'Become a Creator on Digis',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Become a Creator | Digis',
    description: 'Join Digis and start earning through video calls, live streams, paid DMs, subscriptions, and AI Twin.',
    images: ['/images/digis-logo-white.png'],
  },
};

export default function BecomeCreatorLayout({
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
