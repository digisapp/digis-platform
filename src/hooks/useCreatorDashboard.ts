'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/context/AuthContext';
import type { Analytics, Activity, ContentItem, UpcomingEvent } from '@/components/creator-dashboard/types';

export function useCreatorDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
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
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  // Dashboard enhancements
  const [pendingOrders, setPendingOrders] = useState<Activity[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '30' | '90' | 'all'>('30');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [previousEarnings, setPreviousEarnings] = useState(0);
  const [earningsChange, setEarningsChange] = useState<number | null>(null);

  // Redirect to homepage when user signs out
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    checkAuth().then((result) => {
      if (result.authorized) {
        setLoading(false);

        if (result.profile) {
          setUserProfile(result.profile);
          setFollowerCount(result.profile.followerCount || 0);
          setSubscriberCount(result.profile.subscriberCount || 0);
          const dismissed = localStorage.getItem('creator_checklist_dismissed');
          if (dismissed === 'true') {
            setDismissedChecklist(true);
          }

          const needsOnboarding = !result.profile.username ||
            result.profile.username.startsWith('user_');
          if (needsOnboarding) {
            setShowOnboardingModal(true);
          }
        }

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

    const response = await fetch('/api/user/profile');

    if (response.status === 401) {
      console.warn('[Dashboard] Session expired during auth check');
      setLoading(false);
      router.push('/');
      return { authorized: false };
    }

    const data = await response.json();

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

  const handleOnboardingComplete = async () => {
    setShowOnboardingModal(false);
    const response = await fetch('/api/user/profile');
    if (response.ok) {
      const data = await response.json();
      if (data.user) {
        setUserProfile(data.user);
        setFollowerCount(data.user.followerCount || 0);
        setSubscriberCount(data.user.subscriberCount || 0);
      }
    }
  };

  const fetchAnalytics = async (period?: string) => {
    try {
      const periodParam = period || selectedPeriod;
      const url = periodParam === 'all'
        ? '/api/creator/analytics'
        : `/api/creator/analytics?period=${periodParam}`;
      const response = await fetch(url);
      const result = await response.json();
      if (response.ok && result.data) {
        setAnalytics(result.data);
        if (result.data.previousPeriodEarnings !== undefined) {
          setPreviousEarnings(result.data.previousPeriodEarnings);
          const current = result.data.overview?.totalEarnings || 0;
          const previous = result.data.previousPeriodEarnings || 0;
          if (previous > 0) {
            setEarningsChange(((current - previous) / previous) * 100);
          } else if (current > 0) {
            setEarningsChange(100);
          } else {
            setEarningsChange(null);
          }
        }
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
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('/api/wallet/balance', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

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

      if (notificationsRes?.ok) {
        try {
          const notificationsData = await notificationsRes.json();
          const notificationsArray = notificationsData.data?.notifications || [];
          notificationsArray.forEach((notif: any) => {
            let icon: Activity['icon'] = 'coins';
            let color = 'text-gray-400';
            let type: Activity['type'] = 'notification';
            let shouldInclude = false;

            if (notif.type === 'follow' || notif.type === 'followers') {
              icon = 'userplus';
              color = 'text-pink-400';
              type = 'follow';
              shouldInclude = true;
            } else if (notif.type === 'subscribe' || notif.type === 'subscription') {
              icon = 'heart';
              color = 'text-purple-400';
              type = 'subscribe';
              shouldInclude = true;
            } else if (notif.type === 'gift' || notif.type === 'tip' || notif.type === 'stream_tip' || notif.type === 'earnings') {
              icon = 'gift';
              color = 'text-yellow-400';
              type = 'tip';
              shouldInclude = true;
            } else if (notif.type === 'call_completed' || notif.type === 'call_earnings') {
              icon = 'phone';
              color = 'text-cyan-400';
              type = 'tip';
              shouldInclude = true;
            }

            if (shouldInclude) {
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
            }
          });
        } catch (e) {
          console.error('Error parsing notifications data:', e);
        }
      }

      if (showsRes?.ok) {
        try {
          const showsData = await showsRes.json();
          const now = new Date();
          const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

          (showsData.shows || showsData.data || showsData || [])
            .filter((show: any) => {
              if (show.status === 'live') return true;
              if (show.status === 'scheduled') {
                const scheduledTime = new Date(show.scheduledStart || show.scheduledFor);
                return scheduledTime > fourHoursAgo;
              }
              return false;
            })
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

      const orders = activities.filter(a => a.type === 'order');
      const nonOrders = activities.filter(a => a.type !== 'order');
      nonOrders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setPendingOrders(orders);
      setRecentActivities(nonOrders.slice(0, 10));

      events.sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
      setUpcomingEvents(events.slice(0, 3));

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
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
        setRecentActivities(prev => prev.filter(a => a.id !== `order-${orderId}`));
        setPendingOrders(prev => prev.filter(a => a.id !== `order-${orderId}`));
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to fulfill order', 'error');
      }
    } catch (error) {
      console.error('Error fulfilling order:', error);
      showToast('Failed to fulfill order', 'error');
    }
  };

  const refreshDashboard = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchWalletBalance(),
        fetchAnalytics(),
        fetchAllDashboardData(),
        fetchRecentContent(),
      ]);
      setLastUpdated(new Date());
      showToast('Dashboard updated', 'success');
    } catch (err) {
      console.error('Error refreshing dashboard:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePeriodChange = (period: '7' | '30' | '90' | 'all') => {
    setSelectedPeriod(period);
    setShowPeriodDropdown(false);
    fetchAnalytics(period);
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case '7': return 'Last 7 days';
      case '30': return 'Last 30 days';
      case '90': return 'Last 90 days';
      case 'all': return 'All time';
      default: return 'Last 30 days';
    }
  };

  return {
    loading, isCreator,
    analytics, recentActivities, recentContent, upcomingEvents,
    monthlyEarnings, followerCount, subscriberCount,
    userProfile, dismissedChecklist, setDismissedChecklist,
    copiedLink, showOnboardingModal, setShowOnboardingModal,
    pendingOrders, selectedPeriod, showPeriodDropdown, setShowPeriodDropdown,
    lastUpdated, isRefreshing, earningsChange,
    toast, hideToast,
    copyProfileLink, handleOnboardingComplete, handleFulfillOrder,
    refreshDashboard, handlePeriodChange, getPeriodLabel,
  };
}
