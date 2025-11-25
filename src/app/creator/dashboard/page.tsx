'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MobileWalletWidget } from '@/components/ui/MobileWalletWidget';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Toast } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useToast } from '@/hooks/useToast';
import { createClient } from '@/lib/supabase/client';
import { PendingCalls } from '@/components/calls/PendingCalls';
import { Gift, UserPlus, PhoneCall, Video, Clock, Ticket, Calendar, Coins, Radio, Target, Plus } from 'lucide-react';
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
  type: 'gift' | 'follow' | 'call' | 'stream' | 'tip' | 'notification';
  title: string;
  description: string;
  timestamp: string;
  icon: 'gift' | 'userplus' | 'phone' | 'video' | 'coins';
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
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [isCreator, setIsCreator] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [pendingCallsCount, setPendingCallsCount] = useState(0);
  const [lastStreamDate, setLastStreamDate] = useState<Date | null>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [goalFormData, setGoalFormData] = useState({
    description: '',
    targetAmount: 1000,
    showTopTippers: true,
  });
  const [submittingGoal, setSubmittingGoal] = useState(false);
  const [deletingGoal, setDeletingGoal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    // Check auth first, then fetch data in parallel
    checkAuth().then((isAuthorized) => {
      if (isAuthorized) {
        // Fetch all data in parallel for faster loading
        Promise.all([
          fetchBalance(),
          fetchAnalytics(),
          fetchRecentActivities(),
          fetchUpcomingEvents(),
          fetchPendingCounts(),
          fetchGoals(),
        ]);
      }
    });
  }, []);

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

  const checkAuth = async (): Promise<boolean> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/');
      return false;
    }

    // Check if user is creator
    const response = await fetch('/api/user/profile');
    const data = await response.json();

    if (data.user?.role !== 'creator') {
      router.push('/dashboard');
      return false;
    }

    setIsCreator(true);
    setLoading(false);
    return true;
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
      const [callsRes, streamsRes, notificationsRes] = await Promise.all([
        fetch('/api/calls/history?limit=5&status=completed').catch(() => null),
        fetch('/api/streams/my-streams?limit=5').catch(() => null),
        fetch('/api/notifications?limit=20').catch(() => null)
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

      // Process notifications
      if (notificationsRes?.ok) {
        try {
          const notificationsData = await notificationsRes.json();
          const notificationsArray = notificationsData.data?.notifications || [];
          notificationsArray.forEach((notif: any) => {
            let icon: 'gift' | 'userplus' | 'phone' | 'video' | 'coins' = 'coins';
            let color = 'text-gray-400';

            if (notif.type === 'follow' || notif.type === 'followers') {
              icon = 'userplus';
              color = 'text-pink-400';
            } else if (notif.type === 'gift' || notif.type === 'tip' || notif.type === 'stream_tip' || notif.type === 'earnings') {
              icon = 'gift';
              color = 'text-yellow-400';
            }

            activities.push({
              id: `notif-${notif.id}`,
              type: 'notification',
              title: notif.title || 'Notification',
              description: notif.message || '',
              timestamp: notif.createdAt,
              icon,
              color
            });
          });
        } catch (e) {
          console.error('Error parsing notifications data:', e);
        }
      }

      // Sort by timestamp and take top 15
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivities(activities.slice(0, 15));
    } catch (err) {
      console.error('Error fetching recent activities:', err);
      setRecentActivities([]);
    }
  };

  const fetchUpcomingEvents = async () => {
    try {
      // Fetch upcoming shows and booked calls
      const [showsRes, callsRes] = await Promise.all([
        fetch('/api/shows/creator').catch(() => null),
        fetch('/api/calls/history?limit=10&status=pending').catch(() => null)
      ]);

      const events: UpcomingEvent[] = [];

      // Process upcoming shows
      if (showsRes?.ok) {
        try {
          const showsData = await showsRes.json();
          (showsData.data || showsData || [])
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
        } catch (e) {
          console.error('Error parsing shows data:', e);
        }
      }

      // Process upcoming calls
      if (callsRes?.ok) {
        try {
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
        } catch (e) {
          console.error('Error parsing calls data:', e);
        }
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

  const fetchGoals = async () => {
    try {
      const response = await fetch('/api/creator/goals');
      if (response.ok) {
        const data = await response.json();
        setGoals(data.goals || []);

        // Load active goal into form
        const activeGoal = (data.goals || []).find((g: any) => g.isActive && !g.isCompleted);
        if (activeGoal) {
          setGoalFormData({
            description: activeGoal.description || '',
            targetAmount: activeGoal.targetAmount,
            showTopTippers: activeGoal.showTopTippers !== false,
          });
        }
      }
    } catch (err) {
      console.error('Error fetching goals:', err);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingGoal(true);

    try {
      const response = await fetch('/api/creator/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Tip Goal',
          description: goalFormData.description,
          targetAmount: goalFormData.targetAmount,
          rewardText: 'Thank you for your support!',
          goalType: 'coins',
          showTopTippers: goalFormData.showTopTippers,
        }),
      });

      if (response.ok) {
        // Don't reset form - keep values so creator knows what the active goal is
        // Refresh goals list
        fetchGoals();
        showToast('Goal created successfully! 🎯', 'success');
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to create goal', 'error');
      }
    } catch (error) {
      console.error('Error creating goal:', error);
      showToast('Failed to create goal', 'error');
    } finally {
      setSubmittingGoal(false);
    }
  };

  const handleDeleteActiveGoal = () => {
    // Find active goal
    const activeGoal = goals.find(g => g.isActive && !g.isCompleted);

    if (!activeGoal) {
      showToast('No active goal to delete', 'info');
      return;
    }

    // Show confirmation modal
    setShowDeleteConfirm(true);
  };

  const confirmDeleteGoal = async () => {
    const activeGoal = goals.find(g => g.isActive && !g.isCompleted);
    if (!activeGoal) return;

    setShowDeleteConfirm(false);
    setDeletingGoal(true);

    try {
      const response = await fetch(`/api/creator/goals/${activeGoal.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Clear the form
        setGoalFormData({
          description: '',
          targetAmount: 1000,
          showTopTippers: true,
        });
        // Refresh goals list
        fetchGoals();
        showToast('Goal cleared successfully! ✨', 'success');
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to delete goal', 'error');
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
      showToast('Failed to delete goal', 'error');
    } finally {
      setDeletingGoal(false);
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
      case 'coins':
        return <Coins className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20">
      {/* Mobile Header with Logo */}
      <MobileHeader />

      {/* Spacer for fixed mobile header */}
      <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmModal
          title="Clear Goal?"
          message="Are you sure you want to clear this goal? This will remove it from your profile and cannot be undone."
          confirmText="Clear Goal"
          cancelText="Keep Goal"
          variant="danger"
          onConfirm={confirmDeleteGoal}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      <div className="container mx-auto">
        {/* Mobile Wallet Widget */}
        <MobileWalletWidget />

        <div className="px-4 pt-2 md:pt-10 pb-24 md:pb-10">

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div className="mb-8 glass rounded-2xl border border-purple-200 p-6 shadow-fun">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-digis-cyan" />
                Upcoming Events
              </h3>
              <span className="text-sm text-gray-400">{upcomingEvents.length} scheduled</span>
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
                    <div className="font-semibold text-white mb-1">{event.title}</div>
                    <div className="text-sm text-gray-400 mb-1">
                      {new Date(event.scheduledFor).toLocaleDateString()} at {new Date(event.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {event.details && (
                      <div className="text-xs text-gray-400">{event.details}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-4 h-4" />
                    {formatDistanceToNow(new Date(event.scheduledFor), { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Calls, Recent Activity & Create Goal - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 mb-8">
          {/* Left Column: Pending Calls */}
          <PendingCalls />

          {/* Right Column: Activity + Create Goal Form */}
          <div className="flex flex-col gap-6">
            {/* Activity */}
            <div className="glass rounded-2xl border border-cyan-200 p-6 shadow-fun">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-digis-pink" />
              Activity
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
                      <div className="font-medium text-white text-sm mb-1">{activity.title}</div>
                      <div className="text-xs text-gray-400">{activity.description}</div>
                    </div>
                    <div className="text-xs text-gray-400 whitespace-nowrap">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-pink-500/20 flex items-center justify-center mb-4">
                  <Clock className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-white font-medium mb-2">No recent activity</p>
                <p className="text-sm text-gray-300">Your activity will appear here</p>
              </div>
            )}
          </div>

            {/* Create Goal Form */}
            <div className="glass rounded-2xl border border-amber-200 p-4 shadow-fun">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-white">Create Goal</h3>
                {goals.some(g => g.isActive && !g.isCompleted) && (
                  <button
                    type="button"
                    onClick={handleDeleteActiveGoal}
                    disabled={deletingGoal}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingGoal ? 'Deleting...' : 'Clear Goal'}
                  </button>
                )}
              </div>

              <form onSubmit={handleCreateGoal} className="space-y-3">
                {/* Goal Description */}
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Goal Description</label>
                  <textarea
                    value={goalFormData.description}
                    onChange={(e) => setGoalFormData({ ...goalFormData, description: e.target.value })}
                    placeholder="Describe your goal. Tip goals will be displayed on your creator profile."
                    rows={2}
                    className="w-full px-3 py-2 bg-white/60 border border-purple-200 rounded-lg text-sm text-gray-900 placeholder-gray-600 focus:outline-none focus:border-digis-cyan transition-colors resize-none"
                  />
                </div>

                {/* Tip Goal (Coins) */}
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Tip Goal in Coins *</label>
                  <input
                    type="number"
                    min="1"
                    value={goalFormData.targetAmount}
                    onChange={(e) => setGoalFormData({ ...goalFormData, targetAmount: parseInt(e.target.value) || 0 })}
                    placeholder="e.g., 10000"
                    className="w-full px-3 py-2 bg-white/60 border border-purple-200 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:border-digis-cyan transition-colors"
                    required
                  />
                </div>

                {/* Show Top Tippers Toggle */}
                <div className="flex items-center justify-between py-2 px-3 bg-purple-50/50 rounded-lg border border-purple-200">
                  <label htmlFor="showTopTippers" className="text-xs font-medium text-gray-300 cursor-pointer">
                    Show Top Supporters
                  </label>
                  <button
                    type="button"
                    id="showTopTippers"
                    onClick={() => setGoalFormData({ ...goalFormData, showTopTippers: !goalFormData.showTopTippers })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      goalFormData.showTopTippers ? 'bg-gradient-to-r from-digis-cyan to-digis-pink' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        goalFormData.showTopTippers ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Action */}
                <button
                  type="submit"
                  disabled={submittingGoal}
                  className="w-full px-4 py-2 bg-gradient-to-r from-digis-cyan to-digis-pink text-white text-sm rounded-lg font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingGoal ? 'Creating...' : 'Create Goal'}
                </button>
              </form>
            </div>
        </div>
        </div>
      </div>
      </div>
    </div>
  );
}
