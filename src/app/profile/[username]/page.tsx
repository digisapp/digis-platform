'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui';

/**
 * Redirect from old /profile/username URL to new /username format
 */
export default function ProfileRedirect() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  useEffect(() => {
    if (username) {
      router.replace(`/${username}`);
    }
  }, [username, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}
