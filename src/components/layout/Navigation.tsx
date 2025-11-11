'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import {
  Home,
  Search,
  Flame,
  MessageCircle,
  Wallet,
  Video,
  Sparkles,
  Bell,
  Plus,
  Upload,
  Ticket,
  Phone,
  Coins
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  isRead: boolean;
  imageUrl: string | null;
  createdAt: Date;
}

export function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('fan');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationCategory, setNotificationCategory] = useState<string>('all');
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const init = async () => {
      await checkUser();
    };
    init();

    // Listen for auth state changes (logout, session expiry, etc.)
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setUserRole('fan');
        setBalance(0);
      } else if (event === 'SIGNED_IN' && session?.user) {
        checkUser();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    // Only fetch balance and unread count if user is authenticated
    fetchBalance();
    fetchUnreadCount();
    fetchNotifications();
    fetchNotificationCount();

    // Subscribe to real-time updates
    const supabase = createClient();
    const messagesChannel = supabase
      .channel('navigation-unread')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    const notificationsChannel = supabase
      .channel('navigation-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          fetchNotifications();
          fetchNotificationCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [user]);

  // Refetch notifications when category changes
  useEffect(() => {
    if (user && showNotifications) {
      fetchNotifications();
    }
  }, [notificationCategory]);

  const checkUser = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      setUser(user);

      // Get user role and profile data (including avatar)
      const response = await fetch('/api/user/profile');
      const data = await response.json();
      if (data.user) {
        setUserRole(data.user.role);
        setUserProfile(data.user);
        setFollowerCount(data.user.followerCount || 0);
      }
    }
  };

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/wallet/balance');
      const data = await response.json();
      if (response.ok) {
        setBalance(data.balance);
      }
    } catch (err) {
      // User not logged in
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/messages/unread-count');
      const data = await response.json();
      if (response.ok) {
        setUnreadCount(data.count);
      }
    } catch (err) {
      // User not logged in
    }
  };

  const fetchNotifications = async () => {
    try {
      const categoryParam = notificationCategory !== 'all' ? `&category=${notificationCategory}` : '';
      const response = await fetch(`/api/notifications?limit=20${categoryParam}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setNotifications(result.data.notifications || []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const fetchNotificationCount = async () => {
    try {
      const response = await fetch('/api/notifications/unread-count');
      const data = await response.json();
      if (response.ok) {
        setNotificationCount(data.count);
      }
    } catch (err) {
      console.error('Error fetching notification count:', err);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });
      fetchNotifications();
      fetchNotificationCount();
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });
      fetchNotifications();
      fetchNotificationCount();
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null); // Clear user state to hide navigation
    router.push('/');
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  // Define arrays before early return
  const navItems = [
    {
      label: 'Home',
      icon: Home,
      path: userRole === 'admin' ? '/admin' : userRole === 'creator' ? '/creator/dashboard' : '/dashboard',
      active: isActive('/dashboard') || isActive('/creator/dashboard') || isActive('/admin'),
    },
    {
      label: 'Explore',
      icon: Search,
      path: '/explore',
      active: isActive('/explore') || pathname?.startsWith('/profile'),
    },
    {
      label: 'Messages',
      icon: MessageCircle,
      path: '/messages',
      active: isActive('/messages') || pathname?.startsWith('/messages'),
    },
  ];

  const handleNotificationClick = async (notification: Notification) => {
    await markNotificationAsRead(notification.id);
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
    setShowNotifications(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
      case 'messages':
        return <MessageCircle className="w-5 h-5 text-digis-cyan" />;
      case 'tip':
      case 'earnings':
        return <Wallet className="w-5 h-5 text-yellow-500" />;
      case 'follow':
      case 'followers':
        return <Flame className="w-5 h-5 text-red-500" />;
      case 'system':
        return <Bell className="w-5 h-5 text-gray-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatNotificationTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Creator action options
  const creatorActions = [
    {
      id: 'go-live',
      icon: Video,
      title: 'Go Live',
      description: 'Start streaming now',
      path: '/creator/go-live',
      gradient: 'from-red-500 to-pink-500',
      iconColor: 'text-red-500',
    },
    {
      id: 'create-post',
      icon: Upload,
      title: 'Create Post',
      description: 'Upload new content',
      path: '/creator/content/new',
      gradient: 'from-blue-500 to-cyan-500',
      iconColor: 'text-blue-500',
    },
    {
      id: 'new-show',
      icon: Ticket,
      title: 'New Show',
      description: 'Create ticketed event',
      path: '/creator/shows/new',
      gradient: 'from-purple-500 to-pink-500',
      iconColor: 'text-purple-500',
    },
    {
      id: 'schedule-call',
      icon: Phone,
      title: 'Schedule Call',
      description: 'Offer 1-on-1 sessions',
      path: '/creator/calls/new',
      gradient: 'from-green-500 to-emerald-500',
      iconColor: 'text-green-500',
    },
  ];

  if (!user) return null;

  return (
    <>
      {/* Creator Create Menu */}
      {showCreateMenu && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setShowCreateMenu(false)}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 glass border border-purple-200 rounded-2xl z-50 w-[90%] max-w-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">What do you want to create?</h2>
                  <p className="text-sm text-gray-600 mt-1">Choose an action to get started</p>
                </div>
                <button
                  onClick={() => setShowCreateMenu(false)}
                  className="text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Action Grid */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {creatorActions.map((action) => {
                const IconComponent = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => {
                      router.push(action.path);
                      setShowCreateMenu(false);
                    }}
                    className="group relative p-6 bg-white/60 hover:bg-white/80 border border-purple-200 hover:border-purple-300 rounded-xl transition-all hover:scale-105 shadow-fun"
                  >
                    {/* Gradient background on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-10 rounded-xl transition-opacity`} />

                    {/* Content */}
                    <div className="relative flex items-start gap-4">
                      <div className={`p-3 rounded-lg bg-gradient-to-br ${action.gradient} bg-opacity-20`}>
                        <IconComponent className={`w-6 h-6 ${action.iconColor}`} />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="font-bold text-gray-800 text-lg mb-1">{action.title}</h3>
                        <p className="text-sm text-gray-600">{action.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Profile Dropdown Menu */}
      {showProfileMenu && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setShowProfileMenu(false)}
          />
          <div className="fixed md:left-24 md:top-20 top-20 right-4 md:right-auto glass backdrop-blur-xl border border-purple-200 rounded-xl z-50 w-72 overflow-hidden shadow-lg">
            {/* Profile Header */}
            <div className="p-4 border-b border-purple-200 bg-gradient-to-br from-digis-cyan/10 to-digis-pink/10">
              <div className="flex items-center gap-3 mb-3">
                {userProfile?.avatarUrl ? (
                  <img
                    src={userProfile.avatarUrl}
                    alt="Your avatar"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-lg font-bold text-white">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 truncate">
                    {userProfile?.displayName || userProfile?.username || 'User'}
                  </p>
                  <p className="text-sm text-gray-600 truncate">
                    @{userProfile?.username || user?.email}
                  </p>
                  <p className="text-xs text-gray-600 capitalize mt-0.5">
                    {userRole}
                  </p>
                </div>
              </div>
              {/* Follower Count - Clickable */}
              <button
                onClick={() => {
                  router.push('/creator/followers');
                  setShowProfileMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 bg-white/60 hover:bg-white/80 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-sm font-semibold text-gray-800">
                  {followerCount.toLocaleString()} {followerCount === 1 ? 'Follower' : 'Followers'}
                </span>
              </button>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <button
                onClick={() => {
                  router.push(`/${userProfile?.username || 'profile'}`);
                  setShowProfileMenu(false);
                }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/60 transition-colors text-left"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm text-gray-800 font-medium">View Profile</span>
              </button>

              {userRole === 'creator' && (
                <>
                  <button
                    onClick={() => {
                      router.push('/creator/subscriptions/setup');
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/60 transition-colors text-left"
                  >
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    <span className="text-sm text-gray-800 font-medium">Subscriptions</span>
                  </button>

                  <button
                    onClick={() => {
                      router.push('/creator/analytics');
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/60 transition-colors text-left"
                  >
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="text-sm text-gray-800 font-medium">Analytics</span>
                  </button>

                  <button
                    onClick={() => {
                      router.push('/creator/earnings');
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/60 transition-colors text-left"
                  >
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-800 font-medium">Earnings</span>
                  </button>

                  <button
                    onClick={() => {
                      router.push('/calls/history');
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/60 transition-colors text-left"
                  >
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-sm text-gray-800 font-medium">Call Requests</span>
                  </button>
                </>
              )}

              <button
                onClick={() => {
                  router.push('/settings');
                  setShowProfileMenu(false);
                }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/60 transition-colors text-left"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="text-sm text-gray-800 font-medium">Edit Profile</span>
              </button>

              <button
                onClick={() => {
                  router.push('/settings');
                  setShowProfileMenu(false);
                }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/60 transition-colors text-left"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm text-gray-800 font-medium">Settings</span>
              </button>

              {userRole === 'creator' && (
                <button
                  onClick={() => {
                    router.push('/dashboard');
                    setShowProfileMenu(false);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/60 transition-colors text-left border-t border-purple-100"
                >
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  <span className="text-sm text-gray-800 font-medium">Switch to Fan Mode</span>
                </button>
              )}

              <button
                onClick={() => {
                  handleLogout();
                  setShowProfileMenu(false);
                }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 transition-colors text-left border-t border-purple-100"
              >
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="text-sm text-red-600 font-medium">Logout</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Notification Dropdown */}
      {showNotifications && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setShowNotifications(false)}
          />
          <div className="fixed md:left-24 md:bottom-24 bottom-20 right-4 md:right-auto glass backdrop-blur-xl border border-purple-200 rounded-xl z-50 w-96 max-h-[32rem] overflow-hidden shadow-lg">
            {/* Header with Categories */}
            <div className="p-4 border-b border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800">Notifications</h3>
                <div className="flex items-center gap-2">
                  {notificationCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-digis-cyan hover:text-digis-pink transition-colors font-semibold"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Category Tabs */}
              <div className="flex gap-2 overflow-x-auto">
                {['all', 'earnings', 'followers'].map((category) => (
                  <button
                    key={category}
                    onClick={() => setNotificationCategory(category)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      notificationCategory === category
                        ? 'bg-digis-cyan text-white'
                        : 'bg-white/60 text-gray-700 hover:bg-white/80'
                    }`}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-96">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-600">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full p-4 border-b border-purple-100 hover:bg-white/40 transition-colors text-left ${
                      !notification.isRead ? 'bg-digis-cyan/10' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 mb-1">{notification.title}</p>
                        <p className="text-sm text-gray-700">{notification.message}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          {formatNotificationTime(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 rounded-full bg-digis-cyan flex-shrink-0 mt-2" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Mobile Bottom Navigation (TikTok/Instagram style) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass backdrop-blur-xl border-t border-purple-200 pb-safe shadow-lg">
        <div className="flex items-center justify-around h-16 px-2">
          {/* Home */}
          <button
            onClick={() => router.push(navItems[0].path)}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
              navItems[0].active ? 'text-digis-cyan' : 'text-gray-600'
            }`}
          >
            {(() => {
              const Icon = navItems[0].icon;
              return <Icon className="w-6 h-6" />;
            })()}
            <span className="text-xs font-medium">{navItems[0].label}</span>
          </button>

          {/* Explore */}
          <button
            onClick={() => router.push(navItems[1].path)}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
              navItems[1].active ? 'text-digis-cyan' : 'text-gray-600'
            }`}
          >
            {(() => {
              const Icon = navItems[1].icon;
              return <Icon className="w-6 h-6" />;
            })()}
            <span className="text-xs font-medium">{navItems[1].label}</span>
          </button>

          {/* Center Action Button - Creators Only */}
          {userRole === 'creator' && (
            <button
              onClick={() => router.push('/creator/go-live')}
              className="flex flex-col items-center justify-center -mt-6 w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-pink-500 shadow-lg shadow-red-500/50 border-2 border-white"
            >
              <Video className="w-7 h-7 text-white" />
            </button>
          )}

          {/* Messages */}
          <button
            onClick={() => router.push(navItems[2].path)}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
              navItems[2].active ? 'text-digis-cyan' : 'text-gray-600'
            }`}
          >
            {(() => {
              const Icon = navItems[2].icon;
              return <Icon className="w-6 h-6" />;
            })()}
            <span className="text-xs font-medium">{navItems[2].label}</span>
          </button>

          {/* Wallet/Balance Button (Separate) */}
          <button
            onClick={() => router.push('/wallet')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
              isActive('/wallet') ? 'text-amber-500' : 'text-gray-600'
            }`}
          >
            <Coins className="w-6 h-6 text-amber-500" />
            <span className="text-xs font-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 bg-clip-text text-transparent">{balance}</span>
          </button>

          {/* Profile/Settings Button (Separate) */}
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
              isActive('/settings') || showProfileMenu ? 'text-digis-cyan' : 'text-gray-600'
            }`}
          >
            {userProfile?.avatarUrl ? (
              <img
                src={userProfile.avatarUrl}
                alt="Your avatar"
                className="w-7 h-7 rounded-full object-cover border-2 border-digis-cyan/50"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-white font-bold text-xs">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <span className="text-xs font-medium">You</span>
          </button>
        </div>
      </nav>

      {/* Desktop Side Navigation */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 glass backdrop-blur-xl border-r border-purple-200 flex-col items-center py-6 z-50 shadow-lg">
        {/* Logo */}
        <button
          onClick={() => router.push(userRole === 'admin' ? '/admin' : userRole === 'creator' ? '/creator/dashboard' : '/dashboard')}
          className="mb-4 hover:scale-105 transition-transform flex items-center justify-center"
          title="Home"
        >
          <Image
            src="/images/digis-logo-black.png"
            alt="Digis Logo"
            width={48}
            height={48}
            className="w-12 h-auto"
            priority
          />
        </button>

        {/* User Profile / Settings Button */}
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className={`mb-3 w-12 h-12 rounded-full transition-all ${
            isActive('/settings') || showProfileMenu
              ? 'scale-105 ring-2 ring-digis-cyan ring-offset-2 ring-offset-white'
              : 'hover:scale-105'
          }`}
          title="Profile Menu"
        >
          {userProfile?.avatarUrl ? (
            <img
              src={userProfile.avatarUrl}
              alt="Your avatar"
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-lg font-bold">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
        </button>

        {/* Balance - Clickable */}
        <button
          onClick={() => router.push('/wallet')}
          className="mb-6 flex flex-col items-center justify-center gap-1 px-3 py-3 bg-gradient-to-br from-amber-400/20 via-yellow-400/20 to-amber-500/20 hover:from-amber-400/30 hover:to-amber-500/30 rounded-2xl border-2 border-amber-500/40 hover:border-amber-500/60 transition-all hover:scale-105 group shadow-lg shadow-amber-500/20"
          title="Wallet"
        >
          <Coins className="w-7 h-7 text-amber-500 group-hover:rotate-12 transition-transform" />
          <div className="text-xl font-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
            {balance}
          </div>
        </button>

        {/* Creator Create Button - Canva Style */}
        {userRole === 'creator' && (
          <button
            onClick={() => setShowCreateMenu(true)}
            className="mb-8 w-14 h-14 rounded-xl bg-gradient-to-br from-digis-cyan to-digis-pink hover:scale-105 transition-all shadow-lg shadow-digis-cyan/50 flex items-center justify-center group"
            title="Create"
          >
            <Plus className="w-7 h-7 text-white group-hover:rotate-90 transition-transform" />
          </button>
        )}

        {/* Navigation Items */}
        <div className="flex-1 flex flex-col gap-4">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                  item.active
                    ? 'bg-digis-cyan/15 text-digis-cyan scale-105'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-white/40'
                }`}
                title={item.label}
              >
                <div className="relative">
                  <IconComponent className="w-6 h-6" />
                  {item.label === 'Messages' && unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}

          {/* Go Live - Creators Only */}
          {userRole === 'creator' && (
            <button
              onClick={() => router.push('/creator/go-live')}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/40 hover:scale-105 transition-all"
              title="Go Live"
            >
              <div className="relative">
                <Video className="w-6 h-6 text-red-500" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </div>
              <span className="text-xs font-bold text-red-500">LIVE</span>
            </button>
          )}
        </div>

        {/* Notifications Button */}
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
            showNotifications
              ? 'bg-digis-cyan/15 text-digis-cyan scale-105'
              : 'text-gray-600 hover:text-gray-800 hover:bg-white/40'
          }`}
          title="Notifications"
        >
          <div className="relative">
            <Bell className="w-6 h-6" />
            {notificationCount > 0 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                {notificationCount > 9 ? '9+' : notificationCount}
              </div>
            )}
          </div>
          <span className="text-xs font-medium">Alerts</span>
        </button>
      </nav>

      {/* Spacer for desktop side nav */}
      <div className="hidden md:block w-20" />

      {/* Spacer for mobile bottom nav */}
      <div className="md:hidden h-16" />
    </>
  );
}
