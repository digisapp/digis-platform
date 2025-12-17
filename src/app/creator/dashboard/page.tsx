'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Toast } from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import { createClient } from '@/lib/supabase/client';
import {
  Gift, UserPlus, PhoneCall, Video, Clock, Ticket, Calendar, Coins, Radio,
  Upload, TrendingUp, Eye, Heart, Play, Image as ImageIcon, MessageCircle,
  CheckCircle, Circle, Sparkles, X, Instagram, Link2, Copy, Package
} from 'lucide-react';
import { MediaThumbnail } from '@/components/ui/MediaThumbnail';
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
  type: 'gift' | 'follow' | 'call' | 'stream' | 'tip' | 'notification' | 'subscribe' | 'order';
  title: string;
  description: string;
  timestamp: string;
  icon: 'gift' | 'userplus' | 'phone' | 'video' | 'coins' | 'heart' | 'package';
  color: string;
  amount?: number;
  action?: {
    label: string;
    orderId: string;
  };
}

interface ContentItem {
  id: string;
  type: 'video' | 'photo' | 'gallery';
  title: string;
  thumbnailUrl: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
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
  const [isCreator, setIsCreator] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [recentContent, setRecentContent] = useState<ContentItem[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [subscriberCount, setSubscriberCount] = useState(0);

  const [userProfile, setUserProfile] = useState<any>(null);
  const [dismissedChecklist, setDismissedChecklist] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    checkAuth().then((result) => {
      if (result.authorized) {
        setLoading(false);

        // If checkAuth already fetched the profile, use it
        if (result.profile) {
          setUserProfile(result.profile);
          setFollowerCount(result.profile.followerCount || 0);
          setSubscriberCount(result.profile.subscriberCount || 0);
          const dismissed = localStorage.getItem('creator_checklist_dismissed');
          if (dismissed === 'true') {
            setDismissedChecklist(true);
          }
        }

        // Fetch all data in parallel - don't block page load
        // Only fetch profile if checkAuth didn't already get it
        Promise.all([
          fetchWalletBalance(),
          fetchAnalytics(),
          fetchAllDashboardData(),
          !result.profile && fetchUserProfile(),
          fetchRecentContent(),
        ].filter(Boolean));
      }
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch(e.key.toLowerCase()) {
        case 'l':
          router.push('/creator/go-live');
          break;
        case 'u':
          router.push('/creator/content/new');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [router]);

  const checkAuth = async (): Promise<{ authorized: boolean; profile?: any }> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      router.push('/');
      return { authorized: false };
    }

    const jwtRole = (user.app_metadata as any)?.role || (user.user_metadata as any)?.role;

    if (jwtRole && jwtRole !== 'creator') {
      setLoading(false);
      router.push('/dashboard');
      return { authorized: false };
    }

    // Always fetch profile to get full data (follower count, etc.)
    // This replaces the separate fetchUserProfile call
    const response = await fetch('/api/user/profile');

    // Handle auth failures - redirect to login
    if (response.status === 401) {
      console.warn('[Dashboard] Session expired during auth check');
      setLoading(false);
      router.push('/');
      return { authorized: false };
    }

    const data = await response.json();

    // Check role if not in JWT
    if (!jwtRole && data.user?.role !== 'creator') {
      setLoading(false);
      router.push('/dashboard');
      return { authorized: false };
    }

    setIsCreator(true);
    return { authorized: true, profile: data.user };
  };

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');

      // Handle auth failures - redirect to login
      if (response.status === 401) {
        console.warn('[Dashboard] Session expired, redirecting to login');
        router.push('/');
        return;
      }

      const data = await response.json();
      if (response.ok && data.user) {
        setUserProfile(data.user);
        setFollowerCount(data.user.followerCount || 0);
        setSubscriberCount(data.user.subscriberCount || 0);
        // Check if checklist was dismissed
        const dismissed = localStorage.getItem('creator_checklist_dismissed');
        if (dismissed === 'true') {
          setDismissedChecklist(true);
        }
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  const copyProfileLink = async () => {
    if (!userProfile?.username) return;
    const link = `https://digis.cc/${userProfile.username}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      showToast('Link copied! Share it on Instagram', 'success');
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/creator/analytics');
      const result = await response.json();
      if (response.ok && result.data) {
        setAnalytics(result.data);
      } else if (result.degraded) {
        setAnalytics(result.data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch('/api/wallet/balance', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Handle auth failures
      if (response.status === 401) {
        console.warn('[Dashboard] Session expired, redirecting to login');
        router.push('/');
        return;
      }

      const result = await response.json();
      if (response.ok) {
        setMonthlyEarnings(result.balance || 0);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching wallet:', err);
      }
    }
  };

  const fetchRecentContent = async () => {
    try {
      const response = await fetch('/api/content/creator?limit=6');
      if (response.ok) {
        const data = await response.json();
        const contentArray = data.content || data.data || [];
        setRecentContent(contentArray.slice(0, 6).map((item: any) => ({
          id: item.id,
          type: item.contentType || item.type || 'photo',
          title: item.title || item.caption || 'Untitled',
          thumbnailUrl: item.thumbnailUrl || item.mediaUrl || null,
          viewCount: item.viewCount || 0,
          likeCount: item.likeCount || 0,
          commentCount: item.commentCount || 0,
          createdAt: item.createdAt,
        })));
      }
    } catch (err) {
      console.error('Error fetching content:', err);
    }
  };

  const fetchAllDashboardData = async () => {
    try {
      const [notificationsRes, showsRes, ordersRes] = await Promise.all([
        fetch('/api/notifications?limit=30').catch(() => null),
        fetch('/api/shows/creator').catch(() => null),
        fetch('/api/creator/orders?status=pending').catch(() => null),
      ]);

      const activities: Activity[] = [];
      const events: UpcomingEvent[] = [];

      // Process notifications - focus on tips, follows, subscriptions
      if (notificationsRes?.ok) {
        try {
          const notificationsData = await notificationsRes.json();
          const notificationsArray = notificationsData.data?.notifications || [];
          notificationsArray.forEach((notif: any) => {
            let icon: Activity['icon'] = 'coins';
            let color = 'text-gray-400';
            let type: Activity['type'] = 'notification';

            if (notif.type === 'follow' || notif.type === 'followers') {
              icon = 'userplus';
              color = 'text-pink-400';
              type = 'follow';
            } else if (notif.type === 'subscribe' || notif.type === 'subscription') {
              icon = 'heart';
              color = 'text-purple-400';
              type = 'subscribe';
            } else if (notif.type === 'gift' || notif.type === 'tip' || notif.type === 'stream_tip' || notif.type === 'earnings') {
              icon = 'gift';
              color = 'text-yellow-400';
              type = 'tip';
            }

            activities.push({
              id: `notif-${notif.id}`,
              type,
              title: notif.title || 'Notification',
              description: notif.message || '',
              timestamp: notif.createdAt,
              icon,
              color,
              amount: notif.amount,
            });
          });
        } catch (e) {
          console.error('Error parsing notifications data:', e);
        }
      }

      // Process shows - add upcoming to events
      if (showsRes?.ok) {
        try {
          const showsData = await showsRes.json();
          (showsData.shows || showsData.data || showsData || [])
            .filter((show: any) => ['scheduled', 'live'].includes(show.status))
            .forEach((show: any) => {
              events.push({
                id: `show-${show.id}`,
                type: 'show',
                title: show.title,
                scheduledFor: show.scheduledStart || show.scheduledFor,
                details: `${show.ticketsSold || 0}/${show.maxTickets || '∞'} tickets sold`
              });
            });
        } catch (e) {
          console.error('Error parsing shows data:', e);
        }
      }

      // Process pending orders (show at top as they need action)
      if (ordersRes?.ok) {
        try {
          const ordersData = await ordersRes.json();
          const ordersArray = ordersData.orders || [];
          ordersArray.forEach((order: any) => {
            activities.unshift({
              id: `order-${order.id}`,
              type: 'order',
              title: `📦 Order: ${order.itemLabel}`,
              description: `@${order.buyer?.username || 'Someone'} ordered for ${order.coinsPaid} coins`,
              timestamp: order.createdAt,
              icon: 'package',
              color: 'text-orange-400',
              amount: order.coinsPaid,
              action: {
                label: 'Fulfill',
                orderId: order.id,
              },
            });
          });
        } catch (e) {
          console.error('Error parsing orders data:', e);
        }
      }

      // Sort activities by timestamp (but keep orders at top)
      const orders = activities.filter(a => a.type === 'order');
      const nonOrders = activities.filter(a => a.type !== 'order');
      nonOrders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivities([...orders, ...nonOrders].slice(0, 10));

      // Sort events by scheduled time
      events.sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
      setUpcomingEvents(events.slice(0, 3));
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  const getActivityIcon = (iconType: string) => {
    switch (iconType) {
      case 'gift':
        return <Gift className="w-4 h-4" />;
      case 'userplus':
        return <UserPlus className="w-4 h-4" />;
      case 'phone':
        return <PhoneCall className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'coins':
        return <Coins className="w-4 h-4" />;
      case 'heart':
        return <Heart className="w-4 h-4" />;
      case 'package':
        return <Package className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Play className="w-4 h-4" />;
      case 'gallery':
        return <ImageIcon className="w-4 h-4" />;
      default:
        return <ImageIcon className="w-4 h-4" />;
    }
  };

  const handleFulfillOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/creator/orders/${orderId}/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        showToast('Order fulfilled!', 'success');
        // Remove the fulfilled order from activities
        setRecentActivities(prev => prev.filter(a => a.id !== `order-${orderId}`));
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to fulfill order', 'error');
      }
    } catch (error) {
      console.error('Error fulfilling order:', error);
      showToast('Failed to fulfill order', 'error');
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
      <MobileHeader />
      <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}

      <div className="container mx-auto">
        <div className="px-4 pt-2 md:pt-10 pb-24 md:pb-10 max-w-6xl mx-auto">

          {/* Getting Started Checklist */}
          {userProfile && !dismissedChecklist && (
            <div className="mb-6 relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-cyan-500/10 to-pink-500/10 border-2 border-cyan-500/30 p-6 shadow-[0_0_30px_rgba(34,211,238,0.15)]">
              <button
                onClick={() => {
                  setDismissedChecklist(true);
                  localStorage.setItem('creator_checklist_dismissed', 'true');
                }}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
                  <Sparkles className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Get Ready to Earn</h2>
                  <p className="text-sm text-gray-400">Complete your profile and start promoting</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Upload Profile Picture */}
                <button
                  onClick={() => router.push('/settings')}
                  className={`flex items-center gap-3 p-4 rounded-xl transition-all ${
                    userProfile.avatarUrl
                      ? 'bg-green-500/10 border border-green-500/30'
                      : 'bg-white/5 border border-white/10 hover:border-cyan-500/50'
                  }`}
                >
                  {userProfile.avatarUrl ? (
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  )}
                  <span className={`text-sm font-medium ${userProfile.avatarUrl ? 'text-green-400' : 'text-white'}`}>
                    Upload profile picture
                  </span>
                </button>

                {/* Set Pricing Rates */}
                <button
                  onClick={() => router.push('/creator/pricing')}
                  className={`flex items-center gap-3 p-4 rounded-xl transition-all ${
                    userProfile.perMinuteRate > 0
                      ? 'bg-green-500/10 border border-green-500/30'
                      : 'bg-white/5 border border-white/10 hover:border-cyan-500/50'
                  }`}
                >
                  {userProfile.perMinuteRate > 0 ? (
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  )}
                  <span className={`text-sm font-medium ${userProfile.perMinuteRate > 0 ? 'text-green-400' : 'text-white'}`}>
                    Set Pricing rates
                  </span>
                </button>

                {/* Share Link on Instagram */}
                <button
                  onClick={copyProfileLink}
                  className="flex items-center gap-3 p-4 rounded-xl transition-all bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/30 hover:border-pink-500/50"
                >
                  <Instagram className="w-5 h-5 text-pink-400 flex-shrink-0" />
                  <div className="text-left min-w-0">
                    <span className="text-sm font-medium text-white block">Share your link on Instagram</span>
                    <span className="text-xs text-gray-400 truncate block">digis.cc/{userProfile.username}</span>
                  </div>
                  {copiedLink ? (
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 ml-auto" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400 flex-shrink-0 ml-auto" />
                  )}
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-3 text-center">
                Let fans know they can watch you Stream and send gifts 🎁
              </p>
            </div>
          )}

          {/* Quick Actions - Above Balance */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => router.push('/creator/go-live')}
              className="flex items-center justify-center gap-3 p-5 rounded-2xl bg-gradient-to-br from-red-500/20 to-pink-500/20 border border-red-500/30 hover:border-red-500/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Radio className="w-6 h-6 text-red-400" />
              <span className="text-lg font-semibold text-white">Go Live</span>
            </button>
            <button
              onClick={() => router.push('/creator/content/new')}
              className="flex items-center justify-center gap-3 p-5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 hover:border-cyan-500/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Upload className="w-6 h-6 text-cyan-400" />
              <span className="text-lg font-semibold text-white">Upload</span>
            </button>
          </div>

          {/* Earnings Summary */}
          <div className="mb-6 p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Balance</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white">{monthlyEarnings.toLocaleString()}</span>
                  <span className="text-lg text-gray-400">coins</span>
                </div>
                <p className="text-sm text-green-400 mt-1">≈ ${(monthlyEarnings * 0.1).toFixed(2)} USD</p>
              </div>
              <div className="hidden md:flex items-center gap-6">
                <button
                  onClick={() => router.push('/creator/community')}
                  className="text-center hover:bg-white/5 px-4 py-2 rounded-lg transition-colors"
                >
                  <p className="text-2xl font-bold text-white">{followerCount.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">Followers</p>
                </button>
                <button
                  onClick={() => router.push('/creator/community?tab=subscribers')}
                  className="text-center hover:bg-white/5 px-4 py-2 rounded-lg transition-colors"
                >
                  <p className="text-2xl font-bold text-white">{subscriberCount.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">Subscribers</p>
                </button>
              </div>
            </div>

            {/* Mobile stats */}
            <div className="flex md:hidden items-center gap-4 mt-4 pt-4 border-t border-white/10">
              <button
                onClick={() => router.push('/creator/community')}
                className="flex-1 text-center py-2 rounded-lg active:bg-white/5 transition-colors"
              >
                <p className="text-xl font-bold text-white">{followerCount.toLocaleString()}</p>
                <p className="text-xs text-gray-400">Followers</p>
              </button>
              <button
                onClick={() => router.push('/creator/community?tab=subscribers')}
                className="flex-1 text-center py-2 rounded-lg active:bg-white/5 transition-colors"
              >
                <p className="text-xl font-bold text-white">{subscriberCount.toLocaleString()}</p>
                <p className="text-xs text-gray-400">Subscribers</p>
              </button>
            </div>
          </div>

          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-purple-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-white">Upcoming</h3>
              </div>
              <div className="space-y-2">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => {
                      if (event.type === 'show') {
                        router.push(`/streams/${event.id.replace('show-', '')}`);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Ticket className="w-4 h-4 text-purple-400" />
                      <div>
                        <p className="text-sm font-medium text-white">{event.title}</p>
                        <p className="text-xs text-gray-400">{event.details}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(event.scheduledFor), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Recent Activity */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-pink-400" />
                  Recent Activity
                </h3>
              </div>

              {recentActivities.length > 0 ? (
                <div className="space-y-2">
                  {recentActivities.slice(0, 8).map((activity) => (
                    <div
                      key={activity.id}
                      className={`flex items-center gap-3 p-3 rounded-lg ${activity.action ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-white/5'}`}
                    >
                      <div className={`p-2 rounded-lg bg-white/10 ${activity.color}`}>
                        {getActivityIcon(activity.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{activity.title}</p>
                        <p className="text-xs text-gray-400 truncate">{activity.description}</p>
                      </div>
                      {activity.action ? (
                        <button
                          onClick={() => handleFulfillOrder(activity.action!.orderId)}
                          className="px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                        >
                          {activity.action.label}
                        </button>
                      ) : (
                        <p className="text-xs text-gray-500 whitespace-nowrap">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-3">
                    <TrendingUp className="w-8 h-8 text-gray-600" />
                  </div>
                  <p className="text-gray-400">No activity yet</p>
                  <p className="text-sm text-gray-500">Tips, follows, and subscriptions will appear here</p>
                </div>
              )}
            </div>

            {/* Content Performance */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-cyan-400" />
                  Your Content
                </h3>
                <button
                  onClick={() => router.push('/creator/content')}
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  View All
                </button>
              </div>

              {recentContent.length > 0 ? (
                <div className="space-y-2">
                  {recentContent.map((content) => (
                    <div
                      key={content.id}
                      className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => router.push(`/content/${content.id}`)}
                    >
                      <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden relative">
                        {content.thumbnailUrl ? (
                          <MediaThumbnail
                            src={content.thumbnailUrl}
                            alt={content.title}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          getContentIcon(content.type)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{content.title}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {content.viewCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" /> {content.likeCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" /> {content.commentCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-3">
                    <ImageIcon className="w-8 h-8 text-gray-600" />
                  </div>
                  <p className="text-gray-400">No content yet</p>
                  <button
                    onClick={() => router.push('/creator/content/new')}
                    className="mt-2 text-sm text-cyan-400 hover:text-cyan-300"
                  >
                    Upload your first post
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
