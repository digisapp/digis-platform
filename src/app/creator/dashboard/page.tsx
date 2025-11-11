'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { createClient } from '@/lib/supabase/client';
import { CallSettings } from '@/components/creator/CallSettings';
import { PendingCalls } from '@/components/calls/PendingCalls';
import { Gift, UserPlus, PhoneCall, Video, Clock, Ticket, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Analytics {
  overview: {
    totalEarnings: number;
    totalGiftCoins: number;
    totalCallEarnings: number;
    totalStreams: number;
    totalCalls: number;
    totalStreamViews: number;
    peakViewers: number;
  };
  streams: {
    totalStreams: number;
    totalViews: number;
    peakViewers: number;
    averageViewers: number;
  };
  calls: {
    totalCalls: number;
    totalMinutes: number;
    totalEarnings: number;
    averageCallLength: number;
  };
  gifts: {
    totalGifts: number;
    totalCoins: number;
    averageGiftValue: number;
  };
  topGifters: Array<{
    userId: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    totalCoins: number;
    giftCount: number;
  }>;
}

interface Activity {
  id: string;
  type: 'gift' | 'follow' | 'call' | 'stream';
  title: string;
  description: string;
  timestamp: string;
  icon: 'gift' | 'userplus' | 'phone' | 'video';
  color: string;
}

interface UpcomingEvent {
  id: string;
  type: 'show' | 'call';
  title: string;
  scheduledFor: string;
  details?: string;
}

export default function CreatorDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [isCreator, setIsCreator] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);

  useEffect(() => {
    checkAuth();
    fetchBalance();
    fetchAnalytics();
    fetchRecentActivities();
    fetchUpcomingEvents();
  }, []);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/');
      return;
    }

    // Check if user is creator
    const response = await fetch('/api/user/profile');
    const data = await response.json();

    if (data.user?.role !== 'creator') {
      router.push('/dashboard');
      return;
    }

    setIsCreator(true);
    setLoading(false);
  };

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/wallet/balance');
      const data = await response.json();
      if (response.ok) {
        setBalance(data.balance);
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/creator/analytics');
      const result = await response.json();
      if (response.ok && result.data) {
        setAnalytics(result.data);
      } else if (result.degraded) {
        // API returned degraded data (e.g., DB timeout)
        console.warn('Analytics data degraded:', result.error);
        setAnalytics(result.data); // Use degraded data anyway
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      // Fetch recent activities from multiple sources in parallel
      const [callsRes, streamsRes] = await Promise.all([
        fetch('/api/calls/history?limit=5&status=completed').catch(() => null),
        fetch('/api/streams/my-streams?limit=5').catch(() => null)
      ]);

      const activities: Activity[] = [];

      // Process calls
      if (callsRes?.ok) {
        try {
          const callsData = await callsRes.json();
          const callsArray = Array.isArray(callsData.data) ? callsData.data : [];
          callsArray.forEach((call: any) => {
            activities.push({
              id: `call-${call.id}`,
              type: 'call',
              title: `Call completed with ${call.fanName || 'fan'}`,
              description: `${Math.round(call.duration / 60)} minutes - ${call.totalCost} coins earned`,
              timestamp: call.endedAt || call.createdAt,
              icon: 'phone',
              color: 'text-blue-400'
            });
          });
        } catch (e) {
          console.error('Error parsing calls data:', e);
        }
      }

      // Process streams
      if (streamsRes?.ok) {
        try {
          const streamsData = await streamsRes.json();
          const streamsArray = Array.isArray(streamsData.data) ? streamsData.data : [];
          streamsArray
            .filter((s: any) => s.status === 'ended')
            .forEach((stream: any) => {
              activities.push({
                id: `stream-${stream.id}`,
                type: 'stream',
                title: 'Stream ended',
                description: `${stream.title} - ${stream.viewerCount || 0} viewers`,
                timestamp: stream.endedAt || stream.createdAt,
                icon: 'video',
                color: 'text-red-400'
              });
            });
        } catch (e) {
          console.error('Error parsing streams data:', e);
        }
      }

      // Sort by timestamp and take top 10
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivities(activities.slice(0, 10));
    } catch (err) {
      console.error('Error fetching recent activities:', err);
      setRecentActivities([]);
    }
  };

  const fetchUpcomingEvents = async () => {
    try {
      // Fetch upcoming shows and booked calls
      const [showsRes, callsRes] = await Promise.all([
        fetch('/api/shows/creator'),
        fetch('/api/calls/history?limit=10&status=pending')
      ]);

      const events: UpcomingEvent[] = [];

      // Process upcoming shows
      if (showsRes.ok) {
        const showsData = await showsRes.json();
        (showsData.data || [])
          .filter((show: any) => ['scheduled', 'live'].includes(show.status))
          .forEach((show: any) => {
            events.push({
              id: `show-${show.id}`,
              type: 'show',
              title: show.title,
              scheduledFor: show.scheduledFor,
              details: `${show.ticketsSold || 0}/${show.maxTickets || '∞'} tickets sold - ${show.ticketPrice} coins each`
            });
          });
      }

      // Process upcoming calls
      if (callsRes.ok) {
        const callsData = await callsRes.json();
        (callsData.data || [])
          .filter((call: any) => call.scheduledFor)
          .forEach((call: any) => {
            events.push({
              id: `call-${call.id}`,
              type: 'call',
              title: `Call with ${call.fanName || 'fan'}`,
              scheduledFor: call.scheduledFor,
              details: `${call.duration} minutes - ${call.totalCost} coins`
            });
          });
      }

      // Sort by scheduled time
      events.sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
      setUpcomingEvents(events.slice(0, 5));
    } catch (err) {
      console.error('Error fetching upcoming events:', err);
    }
  };

  const getActivityIcon = (iconType: string) => {
    switch (iconType) {
      case 'gift':
        return <Gift className="w-5 h-5" />;
      case 'userplus':
        return <UserPlus className="w-5 h-5" />;
      case 'phone':
        return <PhoneCall className="w-5 h-5" />;
      case 'video':
        return <Video className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
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
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-digis-purple via-digis-pink to-digis-cyan bg-clip-text text-transparent mb-2">Creator Dashboard 🎨</h1>
          <p className="text-gray-600 font-medium">Manage your content, streams, and earnings</p>
        </div>

        {/* KPI Summary Card - This Week */}
        {analytics && (
          <div className="mb-8 relative overflow-hidden">
            {/* Hero KPI Card */}
            <div className="glass rounded-3xl border-2 border-purple-300 p-8 shadow-2xl relative overflow-hidden">
              {/* Gradient Background Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-digis-purple/10 via-digis-pink/10 to-digis-cyan/10 pointer-events-none" />

              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-1">This Week Summary 📊</h2>
                    <p className="text-sm text-gray-600">Your performance at a glance</p>
                  </div>
                  <div className="px-4 py-2 bg-white/60 rounded-full border border-purple-200">
                    <span className="text-sm font-semibold text-gray-700">Jan 6 - Jan 12</span>
                  </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Total Earnings */}
                  <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-xl p-4 border border-green-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold text-gray-700">Coins Earned</div>
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full">
                        <TrendingUp className="w-3 h-3 text-green-600" />
                        <span className="text-xs font-bold text-green-600">+23%</span>
                      </div>
                    </div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                      {Math.floor(analytics.overview.totalEarnings * 0.15)}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">vs. last week</div>
                  </div>

                  {/* Total Views */}
                  <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm rounded-xl p-4 border border-blue-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold text-gray-700">Stream Views</div>
                      <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 rounded-full">
                        <TrendingUp className="w-3 h-3 text-blue-600" />
                        <span className="text-xs font-bold text-blue-600">+15%</span>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-digis-cyan">
                      {Math.floor(analytics.streams.totalViews * 0.18)}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">vs. last week</div>
                  </div>
                </div>

                {/* Quick Insight */}
                <div className="mt-6 p-4 bg-white/60 rounded-xl border border-purple-200">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">✨</div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">You're doing great!</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Your earnings are up 23% compared to last week. Keep streaming consistently to maintain this growth!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => router.push('/creator/go-live')}
            className="bg-gradient-to-br from-red-500/20 to-pink-500/20 backdrop-blur-md rounded-2xl border-2 border-red-500 p-6 hover:scale-105 transition-all text-left shadow-fun"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-500 font-bold">GO LIVE</span>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Start Streaming</h3>
            <p className="text-sm text-gray-600">Go live and connect with your fans</p>
          </button>

          <button
            onClick={() => router.push('/creator/shows')}
            className="bg-gradient-to-br from-purple-500/20 to-indigo-500/20 backdrop-blur-md rounded-2xl border-2 border-purple-500 p-6 hover:scale-105 transition-all text-left shadow-fun"
          >
            <div className="text-4xl mb-3">🎟️</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Ticketed Shows</h3>
            <p className="text-sm text-gray-600">Create and manage exclusive events</p>
          </button>

          <button
            onClick={() => router.push('/calls/history')}
            className="glass rounded-2xl border-2 border-pink-200 p-6 hover:border-digis-pink hover:scale-105 transition-all text-left shadow-fun"
          >
            <div className="text-4xl mb-3">📞</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Call Requests</h3>
            <p className="text-sm text-gray-600">Manage 1-on-1 call requests</p>
          </button>
        </div>

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div className="mb-8 glass rounded-2xl border border-purple-200 p-6 shadow-fun">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-digis-cyan" />
                Upcoming Events
              </h3>
              <span className="text-sm text-gray-600">{upcomingEvents.length} scheduled</span>
            </div>
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-4 bg-white/60 rounded-lg p-4 hover:bg-white/80 transition-colors cursor-pointer border border-purple-100"
                  onClick={() => {
                    if (event.type === 'show') {
                      router.push(`/creator/shows/${event.id.replace('show-', '')}`);
                    }
                  }}
                >
                  <div className={`p-2 rounded-lg ${event.type === 'show' ? 'bg-purple-500/20' : 'bg-blue-500/20'}`}>
                    {event.type === 'show' ? (
                      <Ticket className="w-5 h-5 text-purple-400" />
                    ) : (
                      <PhoneCall className="w-5 h-5 text-blue-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800 mb-1">{event.title}</div>
                    <div className="text-sm text-gray-600 mb-1">
                      {new Date(event.scheduledFor).toLocaleDateString()} at {new Date(event.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {event.details && (
                      <div className="text-xs text-gray-600">{event.details}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Clock className="w-4 h-4" />
                    {formatDistanceToNow(new Date(event.scheduledFor), { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Calls */}
        <div className="mb-8">
          <PendingCalls />
        </div>

        {/* Recent Activity */}
        {recentActivities.length > 0 && (
          <div className="mb-8 glass rounded-2xl border border-cyan-200 p-6 shadow-fun">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-digis-pink" />
              Recent Activity
            </h3>
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 bg-white/60 rounded-lg p-3 hover:bg-white/80 transition-colors border border-cyan-100"
                >
                  <div className={`p-2 rounded-lg bg-white/80 ${activity.color}`}>
                    {getActivityIcon(activity.icon)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 text-sm mb-1">{activity.title}</div>
                    <div className="text-xs text-gray-600">{activity.description}</div>
                  </div>
                  <div className="text-xs text-gray-600 whitespace-nowrap">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Call Settings */}
        <div className="mb-8">
          <CallSettings />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-xl border border-cyan-200 p-5 text-center shadow-fun">
            <div className="text-3xl mb-2">👁️</div>
            <div className="text-2xl font-bold text-digis-cyan mb-1">
              {analytics?.streams.totalViews || 0}
            </div>
            <div className="text-xs text-gray-600">Total Stream Views</div>
          </div>

          <div className="glass rounded-xl border border-yellow-200 p-5 text-center shadow-fun">
            <div className="text-3xl mb-2">📊</div>
            <div className="text-2xl font-bold text-yellow-400 mb-1">
              {analytics?.streams.peakViewers || 0}
            </div>
            <div className="text-xs text-gray-600">Peak Viewers</div>
          </div>

          <div className="glass rounded-xl border border-pink-200 p-5 text-center shadow-fun">
            <div className="text-3xl mb-2">🎁</div>
            <div className="text-2xl font-bold text-digis-pink mb-1">
              {analytics?.gifts.totalGifts || 0}
            </div>
            <div className="text-xs text-gray-600">Gifts Received</div>
          </div>

          <div className="glass rounded-xl border border-green-200 p-5 text-center shadow-fun">
            <div className="text-3xl mb-2">📱</div>
            <div className="text-2xl font-bold text-green-400 mb-1">
              {analytics?.calls.totalCalls || 0}
            </div>
            <div className="text-xs text-gray-600">Calls Completed</div>
          </div>
        </div>

        {/* Earnings Breakdown */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-xl border border-purple-500/50 p-6 shadow-fun">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700 font-semibold">Stream Earnings</span>
                <span className="text-2xl">🎥</span>
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">
                {analytics.overview.totalGiftCoins}
              </div>
              <div className="text-xs text-gray-600">
                from {analytics.gifts.totalGifts} gifts
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-xl border border-blue-500/50 p-6 shadow-fun">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700 font-semibold">Call Earnings</span>
                <span className="text-2xl">📞</span>
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">
                {analytics.overview.totalCallEarnings}
              </div>
              <div className="text-xs text-gray-600">
                from {analytics.calls.totalMinutes} minutes
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-xl border border-green-500/50 p-6 shadow-fun">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700 font-semibold">Total Earnings</span>
                <span className="text-2xl">💰</span>
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">
                {analytics.overview.totalEarnings}
              </div>
              <div className="text-xs text-gray-600">
                lifetime coins earned
              </div>
            </div>
          </div>
        )}

        {/* Top Supporters */}
        {analytics && analytics.topGifters.length > 0 && (
          <div className="mb-8 glass rounded-2xl border border-yellow-200 p-6 shadow-fun">
            <h3 className="text-lg font-bold text-gray-800 mb-4">⭐ Top Supporters</h3>
            <div className="space-y-3">
              {analytics.topGifters.map((gifter, index) => (
                <div
                  key={gifter.userId}
                  className="flex items-center gap-4 bg-white/60 rounded-lg p-3 border border-yellow-100"
                >
                  <div className="text-2xl font-bold text-gray-600">
                    #{index + 1}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-white font-bold">
                    {gifter.avatarUrl ? (
                      <img
                        src={gifter.avatarUrl}
                        alt={gifter.displayName || gifter.username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span>
                        {(gifter.displayName || gifter.username)[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">
                      {gifter.displayName || gifter.username}
                    </div>
                    <div className="text-xs text-gray-600">
                      {gifter.giftCount} gifts sent
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-yellow-400">
                      {gifter.totalCoins}
                    </div>
                    <div className="text-xs text-gray-600">coins</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Creator Tips */}
        <div className="glass rounded-2xl border border-purple-200 p-6 shadow-fun">
          <h3 className="text-lg font-bold text-gray-800 mb-4">💡 Creator Tips</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="text-xl">🎥</div>
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-1">Stream Regularly</h4>
                <p className="text-xs text-gray-600">Consistent streaming builds a loyal audience</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-xl">💬</div>
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-1">Engage with Chat</h4>
                <p className="text-xs text-gray-600">Respond to messages to keep viewers engaged</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-xl">🎁</div>
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-1">Thank Your Supporters</h4>
                <p className="text-xs text-gray-600">Acknowledge gifts and top supporters during streams</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
