'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function CreatorAnalyticsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to streams page
    router.replace('/creator/streams');
  }, [router]);

  return (
    <div className="min-h-screen bg-pastel-gradient flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}
