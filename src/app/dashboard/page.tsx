'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { createClient } from '@/lib/supabase/client';

export default function FanDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/');
      return;
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Welcome to Digis 👋</h1>
          <p className="text-gray-400">Explore live streams, connect with creators, and more</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => router.push('/live')}
            className="bg-black/40 backdrop-blur-md rounded-2xl border-2 border-white/10 p-6 hover:border-digis-cyan hover:scale-105 transition-all text-left"
          >
            <div className="text-4xl mb-3">🎥</div>
            <h3 className="text-lg font-bold text-white mb-2">Live Streams</h3>
            <p className="text-sm text-gray-400">Watch creators streaming now</p>
          </button>

          <button
            onClick={() => router.push('/shows')}
            className="bg-gradient-to-br from-purple-500/20 to-indigo-500/20 backdrop-blur-md rounded-2xl border-2 border-purple-500 p-6 hover:scale-105 transition-all text-left"
          >
            <div className="text-4xl mb-3">🎟️</div>
            <h3 className="text-lg font-bold text-white mb-2">Ticketed Shows</h3>
            <p className="text-sm text-gray-400">Exclusive live events</p>
          </button>

          <button
            onClick={() => router.push('/shows/my-tickets')}
            className="bg-black/40 backdrop-blur-md rounded-2xl border-2 border-white/10 p-6 hover:border-purple-500 hover:scale-105 transition-all text-left"
          >
            <div className="text-4xl mb-3">🎫</div>
            <h3 className="text-lg font-bold text-white mb-2">My Tickets</h3>
            <p className="text-sm text-gray-400">View your purchased tickets</p>
          </button>

          <button
            onClick={() => router.push('/calls/history')}
            className="bg-black/40 backdrop-blur-md rounded-2xl border-2 border-white/10 p-6 hover:border-digis-pink hover:scale-105 transition-all text-left"
          >
            <div className="text-4xl mb-3">📞</div>
            <h3 className="text-lg font-bold text-white mb-2">Video Calls</h3>
            <p className="text-sm text-gray-400">Book 1-on-1 calls with creators</p>
          </button>

          <button
            onClick={() => router.push('/content/library')}
            className="bg-black/40 backdrop-blur-md rounded-2xl border-2 border-white/10 p-6 hover:border-digis-cyan hover:scale-105 transition-all text-left"
          >
            <div className="text-4xl mb-3">📚</div>
            <h3 className="text-lg font-bold text-white mb-2">My Library</h3>
            <p className="text-sm text-gray-400">View purchased content</p>
          </button>

          <button
            onClick={() => router.push('/explore')}
            className="bg-black/40 backdrop-blur-md rounded-2xl border-2 border-white/10 p-6 hover:border-digis-cyan hover:scale-105 transition-all text-left"
          >
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-lg font-bold text-white mb-2">Explore Creators</h3>
            <p className="text-sm text-gray-400">Find new creators to follow</p>
          </button>
        </div>
      </div>
    </div>
  );
}
