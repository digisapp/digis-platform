'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui';

// Redirect old tip-menu URL to new pricing page
export default function TipMenuRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/creator/pricing?tab=tip-menu');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}
