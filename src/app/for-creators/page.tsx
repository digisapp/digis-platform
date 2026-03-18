import type { Metadata } from 'next';
import CreatorCarousel from '@/components/marketing/CreatorCarousel';

export const metadata: Metadata = {
  title: 'For Creators | Digis - Get Paid for What You Already Do',
  description:
    'Join Digis and start earning from your content. Paid DMs, video calls, live streaming tips, subscriptions, AI twin, and more. Free to join, no monthly fees.',
};

export default function ForCreatorsPage() {
  return <CreatorCarousel />;
}
