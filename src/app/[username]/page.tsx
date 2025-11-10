'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GlassCard, LoadingSpinner } from '@/components/ui';
import { UserCircle, Users, Calendar, Verified, MessageCircle, Video, Ticket, Radio, Gift, Clock } from 'lucide-react';
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

  // Content tabs
  const [activeTab, setActiveTab] = useState<'streams' | 'shows' | 'about'>('streams');
  const [streams, setStreams] = useState<any[]>([]);
  const [shows, setShows] = useState<any[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [liveStreamId, setLiveStreamId] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [username]);

  useEffect(() => {
    if (profile?.user.id && profile.user.role === 'creator') {
      fetchContent();
      checkIfLive();
    }
  }, [profile?.user.id]);

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

  const fetchContent = async () => {
    if (!profile?.user.id) return;

    setContentLoading(true);
    try {
      // Fetch streams and shows in parallel
      const [streamsRes, showsRes] = await Promise.all([
        fetch(`/api/streams/my-streams?userId=${profile.user.id}`),
        fetch(`/api/shows/creator?creatorId=${profile.user.id}`)
      ]);

      if (streamsRes.ok) {
        const streamsData = await streamsRes.json();
        // Sort by date, most recent first, only show ended streams
        const endedStreams = (streamsData.data || [])
          .filter((s: any) => s.status === 'ended')
          .sort((a: any, b: any) => new Date(b.endedAt || b.startedAt).getTime() - new Date(a.endedAt || a.startedAt).getTime())
          .slice(0, 12); // Show last 12 streams
        setStreams(endedStreams);
      }

      if (showsRes.ok) {
        const showsData = await showsRes.json();
        // Only show upcoming and live shows
        const upcomingShows = (showsData.data || [])
          .filter((s: any) => ['scheduled', 'live'].includes(s.status))
          .sort((a: any, b: any) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
        setShows(upcomingShows);
      }
    } catch (err) {
      console.error('Error fetching content:', err);
    } finally {
      setContentLoading(false);
    }
  };

  const checkIfLive = async () => {
    if (!profile?.user.id) return;

    try {
      const response = await fetch('/api/streams/live');
      if (response.ok) {
        const data = await response.json();
        const liveStream = (data.data || []).find((s: any) => s.creatorId === profile.user.id);
        if (liveStream) {
          setIsLive(true);
          setLiveStreamId(liveStream.id);
        }
      }
    } catch (err) {
      console.error('Error checking live status:', err);
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
      <div className="min-h-screen bg-pastel-gradient flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-pastel-gradient flex items-center justify-center">
        <GlassCard className="max-w-md w-full p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'User does not exist'}</p>
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
    <div className="min-h-screen bg-pastel-gradient">
      {/* Banner */}
      <div className="relative h-64 bg-gradient-to-br from-digis-cyan/30 to-digis-pink/30">
        {user.bannerUrl ? (
          <img
            src={user.bannerUrl}
            alt="Profile banner"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-digis-cyan/20 to-digis-pink/20" />
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
                  className="w-32 h-32 rounded-full border-4 border-white object-cover shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-white bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center shadow-lg">
                  <UserCircle className="w-20 h-20 text-white" />
                </div>
              )}
              {user.isOnline && (
                <div className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 rounded-full border-2 border-white" />
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
          <GlassCard className="p-6 space-y-4 shadow-fun">
            {/* Name and Username */}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-800">
                  {user.displayName || user.username}
                </h1>
                {user.isCreatorVerified && (
                  <Verified className="w-6 h-6 text-digis-cyan fill-digis-cyan" />
                )}
              </div>
              {user.displayName && (
                <p className="text-gray-600">@{user.username}</p>
              )}
            </div>

            {/* Bio */}
            {user.bio && (
              <p className="text-gray-700">{user.bio}</p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span>
                  <strong className="text-gray-800">{followCounts.followers}</strong>{' '}
                  <span className="text-gray-600">Followers</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>
                  <strong className="text-gray-800">{followCounts.following}</strong>{' '}
                  <span className="text-gray-600">Following</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">
                  Joined {new Date(user.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </GlassCard>

          {/* Currently Live Banner */}
          {isLive && liveStreamId && (
            <div className="mt-6">
              <button
                onClick={() => router.push(`/stream/${liveStreamId}`)}
                className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-2xl p-6 transition-all hover:scale-[1.02] border-2 border-red-400"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Radio className="w-8 h-8 text-white" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="inline-block px-2 py-1 bg-red-600 rounded text-sm">LIVE</span>
                        {user.displayName || user.username} is streaming now!
                      </h3>
                      <p className="text-white/80 text-sm">Click to watch the live stream</p>
                    </div>
                  </div>
                  <Video className="w-6 h-6 text-white" />
                </div>
              </button>
            </div>
          )}

          {/* Quick Actions (Creator Only) */}
          {user.role === 'creator' && (
            <div className="mt-6">
              <GlassCard className="p-6 shadow-fun">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Follow */}
                  <button
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                      isFollowing
                        ? 'bg-gray-700/50 border-gray-600'
                        : 'bg-gradient-to-br from-digis-cyan/20 to-digis-pink/20 border-digis-cyan'
                    } disabled:opacity-50`}
                  >
                    <Users className="w-6 h-6 mx-auto mb-2 text-digis-cyan" />
                    <div className="text-sm font-semibold text-white">
                      {isFollowing ? 'Following' : 'Follow'}
                    </div>
                  </button>

                  {/* Message */}
                  <button
                    onClick={handleMessage}
                    className="p-4 rounded-xl border-2 border-blue-200 bg-white/60 hover:bg-white/80 transition-all hover:scale-105"
                  >
                    <MessageCircle className="w-6 h-6 mx-auto mb-2 text-blue-400" />
                    <div className="text-sm font-semibold text-gray-800">Message</div>
                  </button>

                  {/* Send Gift */}
                  <button
                    onClick={() => router.push('/wallet')}
                    className="p-4 rounded-xl border-2 border-yellow-200 bg-white/60 hover:bg-white/80 transition-all hover:scale-105"
                  >
                    <Gift className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
                    <div className="text-sm font-semibold text-gray-800">Send Gift</div>
                  </button>

                  {/* Shows */}
                  {shows.length > 0 && (
                    <button
                      onClick={() => setActiveTab('shows')}
                      className="p-4 rounded-xl border-2 border-purple-500 bg-purple-500/20 hover:bg-purple-500/30 transition-all hover:scale-105"
                    >
                      <Ticket className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                      <div className="text-sm font-semibold text-white">Buy Tickets</div>
                    </button>
                  )}
                </div>
              </GlassCard>
            </div>
          )}

          {/* Content Tabs */}
          <div className="mt-6">
            <GlassCard className="overflow-hidden shadow-fun">
              {/* Tab Headers */}
              <div className="border-b border-purple-200">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('streams')}
                    className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                      activeTab === 'streams'
                        ? 'text-digis-cyan border-b-2 border-digis-cyan bg-digis-cyan/10'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-white/40'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Video className="w-4 h-4" />
                      Streams ({streams.length})
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('shows')}
                    className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                      activeTab === 'shows'
                        ? 'text-digis-cyan border-b-2 border-digis-cyan bg-digis-cyan/10'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-white/40'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Ticket className="w-4 h-4" />
                      Shows ({shows.length})
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('about')}
                    className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                      activeTab === 'about'
                        ? 'text-digis-cyan border-b-2 border-digis-cyan bg-digis-cyan/10'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-white/40'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <UserCircle className="w-4 h-4" />
                      About
                    </div>
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {contentLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="lg" />
                  </div>
                ) : (
                  <>
                    {/* Streams Tab */}
                    {activeTab === 'streams' && (
                      <div>
                        {streams.length === 0 ? (
                          <div className="text-center py-12">
                            <Video className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">No past streams yet</h3>
                            <p className="text-gray-600 mb-4">
                              {isFollowing
                                ? "You'll be notified when they go live"
                                : 'Follow to get notified when they go live'}
                            </p>
                            {!isFollowing && (
                              <button
                                onClick={handleFollowToggle}
                                className="px-6 py-2 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-lg font-semibold hover:scale-105 transition-transform"
                              >
                                Follow {user.displayName || user.username}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {streams.map((stream: any) => (
                              <div
                                key={stream.id}
                                className="group relative aspect-video bg-gray-100 rounded-xl overflow-hidden border border-cyan-200 hover:border-digis-cyan transition-all cursor-pointer shadow-fun"
                                onClick={() => router.push(`/stream/${stream.id}`)}
                              >
                                {/* Thumbnail placeholder */}
                                <div className="absolute inset-0 bg-gradient-to-br from-digis-cyan/20 to-digis-pink/20 flex items-center justify-center">
                                  <Video className="w-12 h-12 text-gray-400" />
                                </div>

                                {/* Stream info overlay */}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent p-4">
                                  <h4 className="text-white font-semibold line-clamp-1 mb-1">
                                    {stream.title}
                                  </h4>
                                  <div className="flex items-center gap-3 text-xs text-gray-300">
                                    <span className="flex items-center gap-1">
                                      <Users className="w-3 h-3" />
                                      {stream.peakViewers || 0} peak
                                    </span>
                                    <span>
                                      {new Date(stream.endedAt || stream.startedAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Shows Tab */}
                    {activeTab === 'shows' && (
                      <div>
                        {shows.length === 0 ? (
                          <div className="text-center py-12">
                            <Ticket className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">No upcoming shows</h3>
                            <p className="text-gray-600">
                              Check back later for ticketed events and special shows
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {shows.map((show: any) => (
                              <div
                                key={show.id}
                                onClick={() => router.push(`/shows/${show.id}`)}
                                className="flex gap-4 p-4 bg-white/60 hover:bg-white/80 rounded-xl border border-purple-200 hover:border-purple-500 transition-all cursor-pointer"
                              >
                                {/* Show thumbnail */}
                                <div className="w-32 h-32 flex-shrink-0 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-500/30">
                                  {show.coverImageUrl ? (
                                    <img src={show.coverImageUrl} alt={show.title} className="w-full h-full object-cover rounded-lg" />
                                  ) : (
                                    <Ticket className="w-12 h-12 text-purple-400" />
                                  )}
                                  {show.status === 'live' && (
                                    <div className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                                      LIVE
                                    </div>
                                  )}
                                </div>

                                {/* Show details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <h3 className="text-lg font-bold text-gray-800 line-clamp-1">{show.title}</h3>
                                      <p className="text-sm text-gray-600 line-clamp-2">{show.description}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm">
                                    <span className="flex items-center gap-1 text-gray-600">
                                      <Clock className="w-4 h-4" />
                                      {new Date(show.scheduledFor).toLocaleString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                    <span className="text-yellow-400 font-semibold">
                                      {show.ticketPrice} coins
                                    </span>
                                    {show.ticketsSold !== undefined && show.maxTickets && (
                                      <span className="text-gray-600">
                                        {show.ticketsSold}/{show.maxTickets} tickets sold
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* About Tab */}
                    {activeTab === 'about' && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-3">About</h3>
                          {user.bio ? (
                            <p className="text-gray-700 whitespace-pre-wrap">{user.bio}</p>
                          ) : (
                            <p className="text-gray-500 italic">No bio yet</p>
                          )}
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-3">Stats</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-white/60 rounded-lg border border-purple-200">
                              <div className="text-2xl font-bold text-gray-800">{followCounts.followers}</div>
                              <div className="text-sm text-gray-600">Followers</div>
                            </div>
                            <div className="p-4 bg-white/60 rounded-lg border border-cyan-200">
                              <div className="text-2xl font-bold text-gray-800">{streams.length}</div>
                              <div className="text-sm text-gray-600">Past Streams</div>
                            </div>
                            <div className="p-4 bg-white/60 rounded-lg border border-pink-200">
                              <div className="text-2xl font-bold text-gray-800">{shows.length}</div>
                              <div className="text-sm text-gray-600">Upcoming Shows</div>
                            </div>
                            <div className="p-4 bg-white/60 rounded-lg border border-purple-200">
                              <div className="text-2xl font-bold text-gray-800">
                                {new Date(user.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </div>
                              <div className="text-sm text-gray-600">Joined</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
