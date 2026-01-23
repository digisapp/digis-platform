'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// Redirect /live to /watch - all live content is now in the Watch hub
export default function LiveStreamsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/watch');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}
