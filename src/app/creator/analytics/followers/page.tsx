'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Users, Calendar, TrendingUp, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Follower {
  id: string;
  userId: string;
  followedAt: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export default function FollowersPage() {
  const router = useRouter();
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFollowers();
  }, []);

  const fetchFollowers = async () => {
    try {
      const response = await fetch('/api/followers');
      if (response.ok) {
        const data = await response.json();
        setFollowers(data.followers || []);
      }
    } catch (error) {
      console.error('Error fetching followers:', error);
    } finally {
      setLoading(false);
    }
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
      <div className="container mx-auto px-4 pt-0 md:pt-4 pb-20 md:pb-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-800 mb-4 flex items-center gap-2"
          >
            ← Back to Analytics
          </button>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Your Followers 💙</h1>
          <p className="text-gray-600">Manage and engage with your fan community</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-digis-cyan" />
              <span className="text-gray-600 text-sm">Total Followers</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{followers.length}</p>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-gray-600 text-sm">This Week</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">
              {followers.filter(f => {
                const followedAt = new Date(f.followedAt);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return followedAt > weekAgo;
              }).length}
            </p>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-purple-500" />
              <span className="text-gray-600 text-sm">This Month</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">
              {followers.filter(f => {
                const followedAt = new Date(f.followedAt);
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return followedAt > monthAgo;
              }).length}
            </p>
          </GlassCard>
        </div>

        {/* Followers List */}
        {followers.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">No followers yet</h3>
            <p className="text-gray-600">
              Share your profile and start streaming to grow your audience!
            </p>
          </GlassCard>
        ) : (
          <GlassCard className="p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Users className="w-6 h-6 text-digis-cyan" />
              All Followers
            </h2>
            <div className="space-y-3">
              {followers.map((follower) => (
                <div
                  key={follower.id}
                  className="flex items-center justify-between p-4 bg-white/60 rounded-xl hover:bg-white/80 transition-colors cursor-pointer"
                  onClick={() => router.push(`/${follower.user.username}`)}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-digis-cyan to-purple-500 flex items-center justify-center text-white font-bold">
                      {follower.user.avatarUrl ? (
                        <img
                          src={follower.user.avatarUrl}
                          alt={follower.user.displayName || follower.user.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6" />
                      )}
                    </div>

                    {/* User Info */}
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {follower.user.displayName || follower.user.username}
                      </h3>
                      <p className="text-sm text-gray-600">@{follower.user.username}</p>
                    </div>
                  </div>

                  {/* Follow Date */}
                  <div className="text-right">
                    <p className="text-xs text-gray-600">
                      Followed {formatDistanceToNow(new Date(follower.followedAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
