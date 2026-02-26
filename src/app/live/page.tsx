'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// Redirect /live to /streams
export default function LiveStreamsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/streams');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}
