'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GlassCard, LoadingSpinner } from '@/components/ui';
import { UserCircle, Users, Calendar, Verified, MessageCircle } from 'lucide-react';
import { RequestCallButton } from '@/components/calls/RequestCallButton';

interface ProfileData {
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    bannerUrl: string | null;
    bio: string | null;
    role: string;
    isCreatorVerified: boolean;
    isOnline: boolean;
    followerCount: number;
    followingCount: number;
    createdAt: string;
  };
  followCounts: {
    followers: number;
    following: number;
  };
  isFollowing: boolean;
  callSettings?: {
    callRatePerMinute: number;
    minimumCallDuration: number;
    isAvailableForCalls: boolean;
  };
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/profile/${username}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load profile');
      }

      setProfile(data);
      setIsFollowing(data.isFollowing);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (followLoading) return;

    setFollowLoading(true);
    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const response = await fetch(`/api/follow/${profile?.user.id}`, {
        method,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update follow status');
      }

      // Update local state
      setIsFollowing(!isFollowing);

      // Update follower count
      if (profile) {
        setProfile({
          ...profile,
          followCounts: {
            ...profile.followCounts,
            followers: profile.followCounts.followers + (isFollowing ? -1 : 1),
          },
        });
      }
    } catch (err: any) {
      console.error('Follow error:', err);
      alert(err.message);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = async () => {
    try {
      // Fetch conversations to see if one exists with this user
      const response = await fetch('/api/messages/conversations');
      const data = await response.json();

      if (response.ok && data.data) {
        // Find conversation with this user
        const existingConversation = data.data.find((conv: any) =>
          conv.user1Id === user.id || conv.user2Id === user.id
        );

        if (existingConversation) {
          // Navigate to existing conversation
          router.push(`/messages/${existingConversation.id}`);
          return;
        }
      }

      // No existing conversation, go to messages page
      // User will need to send the first message to create conversation
      router.push('/messages');
    } catch (error) {
      console.error('Error checking conversations:', error);
      // Fallback to messages page
      router.push('/messages');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-digis-dark flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-digis-dark flex items-center justify-center">
        <GlassCard className="max-w-md w-full p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
          <p className="text-gray-400 mb-4">{error || 'User does not exist'}</p>
          <button
            onClick={() => router.push('/explore')}
            className="px-6 py-2 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-lg font-semibold hover:scale-105 transition-transform"
          >
            Browse Creators
          </button>
        </GlassCard>
      </div>
    );
  }

  const { user, followCounts } = profile;

  return (
    <div className="min-h-screen bg-digis-dark">
      {/* Banner */}
      <div className="relative h-64 bg-gradient-to-br from-digis-cyan/20 to-digis-pink/20">
        {user.bannerUrl ? (
          <img
            src={user.bannerUrl}
            alt="Profile banner"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-digis-cyan/10 to-digis-pink/10" />
        )}
      </div>

      {/* Profile Content */}
      <div className="max-w-4xl mx-auto px-4 -mt-20 pb-12">
        <div className="relative">
          {/* Avatar */}
          <div className="flex items-end gap-6 mb-6">
            <div className="relative">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName || user.username}
                  className="w-32 h-32 rounded-full border-4 border-digis-dark object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-digis-dark bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center">
                  <UserCircle className="w-20 h-20 text-white" />
                </div>
              )}
              {user.isOnline && (
                <div className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 rounded-full border-2 border-digis-dark" />
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleFollowToggle}
                disabled={followLoading}
                className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                  isFollowing
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gradient-to-r from-digis-cyan to-digis-pink hover:scale-105'
                } disabled:opacity-50`}
              >
                {followLoading ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}
              </button>

              <button
                onClick={handleMessage}
                className="px-6 py-2 rounded-lg font-semibold bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 transition-all flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Message
              </button>

              {user.role === 'creator' && profile.callSettings && (
                <div className="min-w-[150px]">
                  <RequestCallButton
                    creatorId={user.id}
                    creatorName={user.displayName || user.username}
                    ratePerMinute={profile.callSettings.callRatePerMinute}
                    minimumDuration={profile.callSettings.minimumCallDuration}
                    isAvailable={profile.callSettings.isAvailableForCalls}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Profile Info */}
          <GlassCard className="p-6 space-y-4">
            {/* Name and Username */}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">
                  {user.displayName || user.username}
                </h1>
                {user.isCreatorVerified && (
                  <Verified className="w-6 h-6 text-digis-cyan fill-digis-cyan" />
                )}
              </div>
              {user.displayName && (
                <p className="text-gray-400">@{user.username}</p>
              )}
            </div>

            {/* Bio */}
            {user.bio && (
              <p className="text-gray-300">{user.bio}</p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span>
                  <strong className="text-white">{followCounts.followers}</strong>{' '}
                  <span className="text-gray-400">Followers</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>
                  <strong className="text-white">{followCounts.following}</strong>{' '}
                  <span className="text-gray-400">Following</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">
                  Joined {new Date(user.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </GlassCard>

          {/* Content Sections */}
          <div className="mt-6">
            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold mb-4">Content</h2>
              <p className="text-gray-400 text-center py-8">
                No content yet. Check back soon!
              </p>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
