'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// Redirect /streams to /live - all live content is now in one place
export default function StreamsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/live');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}
