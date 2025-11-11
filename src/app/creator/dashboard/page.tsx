'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { createClient } from '@/lib/supabase/client';
import { PendingCalls } from '@/components/calls/PendingCalls';
import { Gift, UserPlus, PhoneCall, Video, Clock, Ticket, Calendar } from 'lucide-react';
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
  const [pendingCallsCount, setPendingCallsCount] = useState(0);
  const [lastStreamDate, setLastStreamDate] = useState<Date | null>(null);
  const [earnings24h, setEarnings24h] = useState(0);
  const [earningsPeriod, setEarningsPeriod] = useState<'24h' | '1w' | '1m' | 'total'>('24h');

  useEffect(() => {
    checkAuth();
    fetchBalance();
    fetchAnalytics();
    fetchRecentActivities();
    fetchUpcomingEvents();
    fetchPendingCounts();
  }, []);

  useEffect(() => {
    fetch24hEarnings();
  }, [earningsPeriod]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only trigger if not in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch(e.key.toLowerCase()) {
        case 'l':
          router.push('/creator/go-live');
          break;
        case 's':
          router.push('/creator/shows');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [router]);

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

  const fetchPendingCounts = async () => {
    try {
      // Fetch pending calls count
      const callsRes = await fetch('/api/calls/history?limit=100&status=pending');
      if (callsRes.ok) {
        const callsData = await callsRes.json();
        setPendingCallsCount(callsData.data?.length || 0);
      }

      // Get last stream date
      const streamsRes = await fetch('/api/streams/my-streams?limit=1');
      if (streamsRes.ok) {
        const streamsData = await streamsRes.json();
        if (streamsData.data && streamsData.data.length > 0) {
          setLastStreamDate(new Date(streamsData.data[0].createdAt));
        }
      }
    } catch (err) {
      console.error('Error fetching pending counts:', err);
    }
  };

  const fetch24hEarnings = async () => {
    try {
      // Fetch transactions based on period (limit adjusted for longer periods)
      const limit = earningsPeriod === 'total' ? 1000 : earningsPeriod === '1m' ? 500 : 200;
      const response = await fetch(`/api/wallet/transactions?limit=${limit}`);
      if (response.ok) {
        const data = await response.json();
        const now = new Date();
        let cutoffDate: Date | null = null;

        // Calculate cutoff date based on selected period
        switch (earningsPeriod) {
          case '24h':
            cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '1w':
            cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '1m':
            cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'total':
            cutoffDate = null; // No cutoff, sum all earnings
            break;
        }

        // Sum up positive transactions (earnings) from selected period
        const earnings = (data.transactions || [])
          .filter((tx: any) => {
            if (tx.amount <= 0) return false;
            if (!cutoffDate) return true; // Total earnings
            const txDate = new Date(tx.createdAt);
            return txDate >= cutoffDate;
          })
          .reduce((sum: number, tx: any) => sum + tx.amount, 0);

        setEarnings24h(earnings);
      }
    } catch (err) {
      console.error('Error fetching earnings:', err);
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

        {/* Quick Actions - Core Actions Only */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Earnings with Period Selector */}
          <div className="relative bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-xl border-2 border-green-500 p-8 shadow-fun">
            <div className="flex items-center justify-between mb-3">
              <div className="text-3xl">💰</div>

              {/* Period Selector */}
              <div className="flex gap-1 bg-white/60 rounded-lg p-1">
                {[
                  { value: '24h', label: '24h' },
                  { value: '1w', label: '1W' },
                  { value: '1m', label: '1M' },
                  { value: 'total', label: 'All' },
                ].map((period) => (
                  <button
                    key={period.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEarningsPeriod(period.value as '24h' | '1w' | '1m' | 'total');
                    }}
                    className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
                      earningsPeriod === period.value
                        ? 'bg-green-500 text-white'
                        : 'text-gray-600 hover:bg-white/80'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => router.push('/creator/earnings')}
              className="w-full text-left hover:opacity-80 transition-opacity"
            >
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {earningsPeriod === '24h' && '24h Earnings'}
                {earningsPeriod === '1w' && 'Weekly Earnings'}
                {earningsPeriod === '1m' && 'Monthly Earnings'}
                {earningsPeriod === 'total' && 'Total Earnings'}
              </h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-green-600">{earnings24h.toLocaleString()}</span>
                <span className="text-sm text-gray-600">coins</span>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {earningsPeriod === '24h' && 'Last 24 hours'}
                {earningsPeriod === '1w' && 'Last 7 days'}
                {earningsPeriod === '1m' && 'Last 30 days'}
                {earningsPeriod === 'total' && 'All time'}
              </p>
            </button>
          </div>

          {/* Go Live */}
          <button
            onClick={() => router.push('/creator/go-live')}
            className="relative bg-gradient-to-br from-red-500/20 to-pink-500/20 backdrop-blur-md rounded-xl border-2 border-red-500 p-8 hover:scale-105 transition-all text-left shadow-fun group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-500 font-bold text-xs">GO LIVE</span>
              </div>
              <kbd className="hidden group-hover:block px-2 py-1 text-xs bg-black/10 rounded">L</kbd>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Start Streaming</h3>
            <p className="text-sm text-gray-600">Go live and connect with your fans</p>
            {lastStreamDate && (new Date().getTime() - lastStreamDate.getTime()) > 24 * 60 * 60 * 1000 && (
              <div className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full border-2 border-white" title="You haven't streamed in 24h" />
            )}
          </button>

          {/* Ticketed Shows */}
          <button
            onClick={() => router.push('/creator/shows')}
            className="bg-gradient-to-br from-purple-500/20 to-indigo-500/20 backdrop-blur-md rounded-xl border-2 border-purple-500 p-8 hover:scale-105 transition-all text-left shadow-fun group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-3xl">🎟️</div>
              <kbd className="hidden group-hover:block px-2 py-1 text-xs bg-black/10 rounded">S</kbd>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Ticketed Shows</h3>
            <p className="text-sm text-gray-600">Create and manage exclusive events</p>
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

        {/* Pending Calls & Recent Activity - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Pending Calls - Left Column */}
          <PendingCalls />

          {/* Recent Activity - Right Column */}
          <div className="glass rounded-2xl border border-cyan-200 p-6 shadow-fun">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-digis-pink" />
              Recent Activity
            </h3>
            {recentActivities.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentActivities.slice(0, 8).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 bg-white/60 rounded-lg p-3 hover:bg-white/80 transition-colors border border-cyan-100"
                  >
                    <div className={`p-2 rounded-lg bg-white/80 ${activity.color}`}>
                      {getActivityIcon(activity.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 text-sm mb-1">{activity.title}</div>
                      <div className="text-xs text-gray-600">{activity.description}</div>
                    </div>
                    <div className="text-xs text-gray-600 whitespace-nowrap">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-pink-500/20 flex items-center justify-center mb-4">
                  <Clock className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium mb-2">No recent activity</p>
                <p className="text-sm text-gray-500">Your activity will appear here</p>
              </div>
            )}
          </div>
        </div>

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
