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
      <div className="min-h-screen bg-pastel-gradient flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pastel-gradient">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-digis-purple via-digis-pink to-digis-cyan bg-clip-text text-transparent mb-2">Welcome to Digis 👋</h1>
          <p className="text-gray-600 font-medium">Explore live streams, connect with creators, and more</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => router.push('/live')}
            className="glass rounded-2xl border-2 border-cyan-200 p-6 hover:border-digis-cyan hover:scale-105 transition-all text-left shadow-fun"
          >
            <div className="text-4xl mb-3">🎥</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Live Streams</h3>
            <p className="text-sm text-gray-600">Watch creators streaming now</p>
          </button>

          <button
            onClick={() => router.push('/shows')}
            className="bg-gradient-to-br from-purple-500/20 to-indigo-500/20 backdrop-blur-md rounded-2xl border-2 border-purple-500 p-6 hover:scale-105 transition-all text-left shadow-fun"
          >
            <div className="text-4xl mb-3">🎟️</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Ticketed Shows</h3>
            <p className="text-sm text-gray-600">Exclusive live events</p>
          </button>

          <button
            onClick={() => router.push('/shows/my-tickets')}
            className="glass rounded-2xl border-2 border-purple-200 p-6 hover:border-purple-500 hover:scale-105 transition-all text-left shadow-fun"
          >
            <div className="text-4xl mb-3">🎫</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">My Tickets</h3>
            <p className="text-sm text-gray-600">View your purchased tickets</p>
          </button>

          <button
            onClick={() => router.push('/calls/history')}
            className="glass rounded-2xl border-2 border-pink-200 p-6 hover:border-digis-pink hover:scale-105 transition-all text-left shadow-fun"
          >
            <div className="text-4xl mb-3">📞</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Video Calls</h3>
            <p className="text-sm text-gray-600">Book 1-on-1 calls with creators</p>
          </button>

          <button
            onClick={() => router.push('/content/library')}
            className="glass rounded-2xl border-2 border-cyan-200 p-6 hover:border-digis-cyan hover:scale-105 transition-all text-left shadow-fun"
          >
            <div className="text-4xl mb-3">📚</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">My Library</h3>
            <p className="text-sm text-gray-600">View purchased content</p>
          </button>

          <button
            onClick={() => router.push('/explore')}
            className="glass rounded-2xl border-2 border-purple-200 p-6 hover:border-digis-cyan hover:scale-105 transition-all text-left shadow-fun"
          >
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Explore Creators</h3>
            <p className="text-sm text-gray-600">Find new creators to follow</p>
          </button>
        </div>
      </div>
    </div>
  );
}
