'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LoadingSpinner } from '@/components/ui';

export default function WelcomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          // Not authenticated - go to home
          router.push('/');
          return;
        }

        // Check user profile
        const response = await fetch('/api/user/profile');
        const data = await response.json();

        if (!response.ok || !data.user) {
          // Profile not found - go to username setup
          router.push('/welcome/username');
          return;
        }

        const username = data.user.username;
        const role = data.user.role;

        // If user has auto-generated username, go to username setup
        if (!username || username.startsWith('user_')) {
          router.push('/welcome/username');
          return;
        }

        // If user is already a creator, go to creator dashboard
        if (role === 'creator') {
          router.push('/creator/dashboard');
          return;
        }

        // Regular user with username - go to dashboard
        router.push('/dashboard');
      } catch (error) {
        console.error('Error checking user status:', error);
        router.push('/welcome/username');
      }
    };

    checkUserStatus();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-400">Setting up your account...</p>
      </div>
    </div>
  );
}
