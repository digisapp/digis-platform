'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/**
 * /stream redirect page
 *
 * This route catches navigation to /stream and redirects to the proper streaming setup page.
 * Without this page, /stream would be caught by the [username] dynamic route and show "Profile Not Found".
 */
export default function StreamRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the creator streams page where they can set up and go live
    router.replace('/creator/streams');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="text-gray-400 mt-4">Redirecting to stream setup...</p>
      </div>
    </div>
  );
}
