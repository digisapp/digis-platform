'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { type Role, ROLE_ORDER, isValidRole, parseRole } from '@/types/auth';
import { getRoleWithFallback } from '@/lib/auth/jwt-utils';
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
  // Initialize role from localStorage to prevent flash
  const [userRole, setUserRole] = useState<Role>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('digis_user_role');
      return parseRole(stored, 'fan');
    }
    return 'fan';
  });
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

  // Safe role setter - only upgrade, never downgrade (unless forced)
  const setRoleSafely = (nextRole?: string | null, opts: { force?: boolean } = {}) => {
    if (!nextRole || !isValidRole(nextRole)) {
      console.warn('[Navigation] Invalid role provided:', nextRole);
      return;
    }

    // Force option for authoritative changes (e.g., admin changed user's role)
    if (opts.force) {
      console.log('[Navigation] Force updating role:', userRole, '->', nextRole);
      setUserRole(nextRole);
      if (typeof window !== 'undefined') {
        localStorage.setItem('digis_user_role', nextRole);
      }
      return;
    }

    // Never-downgrade logic for transient errors
    const currentOrder = ROLE_ORDER[userRole];
    const nextOrder = ROLE_ORDER[nextRole];

    // Only update if same level or higher
    if (nextOrder >= currentOrder) {
      setUserRole(nextRole);
      if (typeof window !== 'undefined') {
        localStorage.setItem('digis_user_role', nextRole);
      }
    } else {
      console.log('[Navigation] Ignoring role downgrade:', userRole, '->', nextRole);
    }
  };

  useEffect(() => {
    let aborted = false;

    const init = async () => {
      // ⚡ CRITICAL: Assert role from JWT IMMEDIATELY (before API call)
      // This prevents fan flash even if /api/user/profile briefly fails
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const jwtRole =
        (session?.user?.app_metadata as any)?.role ??
        (session?.user?.user_metadata as any)?.role ??
        null;

      // 🛡️ Last-resort fallback: decode JWT from localStorage if session is null
      const roleWithFallback = getRoleWithFallback(jwtRole);

      if (!aborted && roleWithFallback && isValidRole(roleWithFallback)) {
        console.log('[Navigation] Asserting role immediately:', roleWithFallback, {
          source: jwtRole ? 'JWT session' : 'localStorage fallback'
        });
        setRoleSafely(roleWithFallback, { force: true });
      } else if (!aborted && !roleWithFallback) {
        console.log('[Navigation] No role found in JWT or localStorage, will fetch from API');
      }

      // Now fetch full profile (which may also update role)
      if (!aborted) {
        await checkUser();
      }
    };

    init();

    return () => {
      aborted = true;
    };

    // Heartbeat to keep session alive (every 60 seconds)
    const heartbeatInterval = setInterval(() => {
      fetch('/api/auth/heartbeat', {
        method: 'POST',
        cache: 'no-store'
      }).catch(() => {
        // Silently fail
      });
    }, 60000);

    // Listen for auth state changes (logout, session expiry, etc.)
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setUserRole('fan');
        setBalance(0);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('digis_user_role');
        }
      } else if (event === 'SIGNED_IN' && session?.user) {
        checkUser();
        // Also check for role in JWT on sign-in
        const jwtRole = (session.user.app_metadata as any)?.role ?? (session.user.user_metadata as any)?.role;
        if (jwtRole) setRoleSafely(jwtRole);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Update role from refreshed JWT
        const jwtRole = (session.user.app_metadata as any)?.role ?? (session.user.user_metadata as any)?.role;
        if (jwtRole) setRoleSafely(jwtRole);
      }
    });

    return () => {
      clearInterval(heartbeatInterval);
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
      // Force no-cache to prevent stale role data
      try {
        const response = await fetch('/api/user/profile', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          }
        });

        if (!response.ok) {
          console.error('[Navigation] Profile API error:', response.status);
          // Don't reset role on error - keep current state
          return;
        }

        const data = await response.json();
        console.log('[Navigation] User profile fetched:', {
          email: data.user?.email,
          username: data.user?.username,
          role: data.user?.role,
          isCreatorVerified: data.user?.isCreatorVerified
        });

        if (!data?.user || !data.user.role) {
          // 🚨 DIAGNOSTIC: Log full payload to debug invalid responses
          console.error('[Navigation] Invalid profile payload - preserving current role:', {
            hasData: !!data,
            hasUser: !!data?.user,
            hasRole: !!data?.user?.role,
            fullPayload: data
          });
          return;
        }

        // Force update role from profile API (it comes from JWT app_metadata or DB, which is authoritative)
        setRoleSafely(data.user.role, { force: true });
        setUserProfile(data.user);
        setFollowerCount(data.user.followerCount || 0);
      } catch (error) {
        console.error('[Navigation] Error fetching profile - preserving current role:', error);
        // Don't reset role on error - keep current state
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
      case 'gift':
      case 'earnings':
      case 'stream_tip':
        return <Coins className="w-5 h-5 text-yellow-500" />;
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
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setShowCreateMenu(false)}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-3xl">
            {/* Close button */}
            <button
              onClick={() => setShowCreateMenu(false)}
              className="absolute -top-12 right-0 p-2 text-white hover:bg-white/10 rounded-full transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Action Grid */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 p-3 md:p-4">
              {creatorActions.map((action) => {
                const IconComponent = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => {
                      router.push(action.path);
                      setShowCreateMenu(false);
                    }}
                    className="group relative p-4 md:p-8 bg-white/95 backdrop-blur-xl hover:bg-white border-2 border-transparent hover:border-white rounded-2xl transition-all hover:scale-105 shadow-2xl overflow-hidden"
                  >
                    {/* Animated gradient background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-10 group-hover:opacity-20 transition-opacity duration-300`} />

                    {/* Glow effect */}
                    <div className={`absolute -inset-1 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-300`} />

                    {/* Content */}
                    <div className="relative">
                      {/* Icon */}
                      <div className={`inline-flex p-3 md:p-4 rounded-2xl bg-gradient-to-br ${action.gradient} shadow-lg mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <IconComponent className="w-6 h-6 md:w-8 md:h-8 text-white" />
                      </div>

                      {/* Text */}
                      <h3 className="font-bold text-gray-800 text-base md:text-xl mb-1 md:mb-2">{action.title}</h3>
                      <p className="text-xs md:text-sm text-gray-600 leading-relaxed">{action.description}</p>
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
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setShowProfileMenu(false)}
          />
          <div className="fixed md:left-24 md:top-20 bottom-[calc(72px+env(safe-area-inset-bottom)+8px)] md:bottom-auto right-4 md:right-auto left-4 md:left-24 md:w-72 glass backdrop-blur-xl border-2 border-purple-200 rounded-2xl md:rounded-xl z-50 overflow-hidden shadow-2xl">
            {/* Profile Header */}
            <div className="p-5 md:p-4 border-b border-purple-200 bg-gradient-to-br from-digis-cyan/10 to-digis-pink/10">
              <div className="flex items-center gap-4 md:gap-3 mb-4 md:mb-3">
                {userProfile?.avatarUrl ? (
                  <img
                    src={userProfile.avatarUrl}
                    alt="Your avatar"
                    className="w-14 h-14 md:w-12 md:h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-xl md:text-lg font-bold text-white">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-base md:text-sm truncate">
                    {userProfile?.displayName || userProfile?.username || 'User'}
                  </p>
                  <button
                    onClick={() => {
                      router.push(`/${userProfile?.username || 'profile'}`);
                      setShowProfileMenu(false);
                    }}
                    className="text-xs text-gray-500 hover:text-digis-cyan transition-colors truncate text-left"
                  >
                    digis.cc/{userProfile?.username || 'user'}
                  </button>
                  <p className="text-xs text-gray-600 capitalize mt-1 md:mt-0.5">
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
                className="w-full flex items-center gap-2 px-4 py-3 md:px-3 md:py-2 bg-white/60 hover:bg-white/80 active:bg-white/90 rounded-xl md:rounded-lg transition-all active:scale-98"
                style={{ minHeight: '48px' }}
              >
                <svg className="w-5 h-5 md:w-4 md:h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-sm font-semibold text-gray-900">
                  {followerCount.toLocaleString()} {followerCount === 1 ? 'Follower' : 'Followers'}
                </span>
              </button>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              {userRole === 'creator' && (
                <>
                  <button
                    onClick={() => {
                      router.push('/creator/subscriptions/setup');
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-5 py-4 md:px-4 md:py-3 flex items-center gap-3 hover:bg-white/60 active:bg-white/70 transition-all text-left active:scale-98"
                    style={{ minHeight: '56px' }}
                  >
                    <svg className="w-6 h-6 md:w-5 md:h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    <span className="text-base md:text-sm text-gray-900 font-semibold">Subscriptions</span>
                  </button>

                  <button
                    onClick={() => {
                      router.push('/creator/analytics');
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-5 py-4 md:px-4 md:py-3 flex items-center gap-3 hover:bg-white/60 active:bg-white/70 transition-all text-left active:scale-98"
                    style={{ minHeight: '56px' }}
                  >
                    <svg className="w-6 h-6 md:w-5 md:h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="text-base md:text-sm text-gray-900 font-semibold">Analytics</span>
                  </button>

                  <button
                    onClick={() => {
                      router.push('/creator/earnings');
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-5 py-4 md:px-4 md:py-3 flex items-center gap-3 hover:bg-white/60 active:bg-white/70 transition-all text-left active:scale-98"
                    style={{ minHeight: '56px' }}
                  >
                    <svg className="w-6 h-6 md:w-5 md:h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-base md:text-sm text-gray-900 font-semibold">Earnings</span>
                  </button>

                  <button
                    onClick={() => {
                      router.push('/calls/history');
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-5 py-4 md:px-4 md:py-3 flex items-center gap-3 hover:bg-white/60 active:bg-white/70 transition-all text-left active:scale-98"
                    style={{ minHeight: '56px' }}
                  >
                    <svg className="w-6 h-6 md:w-5 md:h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-base md:text-sm text-gray-900 font-semibold">Call Requests</span>
                  </button>
                </>
              )}

              <button
                onClick={() => {
                  router.push('/settings');
                  setShowProfileMenu(false);
                }}
                className="w-full px-5 py-4 md:px-4 md:py-3 flex items-center gap-3 hover:bg-white/60 active:bg-white/70 transition-all text-left active:scale-98"
                style={{ minHeight: '56px' }}
              >
                <svg className="w-6 h-6 md:w-5 md:h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-base md:text-sm text-gray-900 font-semibold">Account Settings</span>
              </button>

              <button
                onClick={() => {
                  handleLogout();
                  setShowProfileMenu(false);
                }}
                className="w-full px-5 py-4 md:px-4 md:py-3 flex items-center gap-3 hover:bg-red-50 active:bg-red-100 transition-all text-left border-t border-purple-100 active:scale-98"
                style={{ minHeight: '56px' }}
              >
                <svg className="w-6 h-6 md:w-5 md:h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="text-base md:text-sm text-red-600 font-bold">Logout</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Notification Dropdown */}
      {showNotifications && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setShowNotifications(false)}
          />
          <div className="fixed md:left-24 md:bottom-24 bottom-[calc(72px+env(safe-area-inset-bottom)+8px)] md:bottom-24 right-4 left-4 md:left-24 md:right-auto md:w-96 glass backdrop-blur-xl border-2 border-purple-200 rounded-2xl md:rounded-xl z-50 max-h-[70vh] md:max-h-[32rem] overflow-hidden shadow-2xl">
            {/* Header with Categories */}
            <div className="p-5 md:p-4 border-b border-purple-200 bg-gradient-to-br from-digis-cyan/5 to-digis-pink/5">
              <div className="flex items-center justify-between mb-4 md:mb-3">
                <h3 className="font-bold text-gray-900 text-lg md:text-base">Notifications</h3>
                <div className="flex items-center gap-3 md:gap-2">
                  {notificationCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-sm md:text-xs text-digis-cyan hover:text-digis-pink active:text-digis-pink transition-colors font-bold active:scale-95"
                      style={{ minHeight: '32px', minWidth: '32px' }}
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-gray-600 hover:text-gray-900 active:text-gray-900 transition-colors p-2 hover:bg-white/60 rounded-lg active:scale-95"
                    style={{ minHeight: '40px', minWidth: '40px' }}
                  >
                    <svg className="w-6 h-6 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Category Tabs */}
              <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                {['all', 'earnings', 'followers'].map((category) => (
                  <button
                    key={category}
                    onClick={() => setNotificationCategory(category)}
                    className={`px-4 py-2.5 md:px-3 md:py-1 rounded-full text-sm md:text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
                      notificationCategory === category
                        ? 'bg-digis-cyan text-white shadow-lg'
                        : 'bg-white/70 text-gray-800 hover:bg-white/90 active:bg-white'
                    }`}
                    style={{ minHeight: '40px' }}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-[calc(70vh-180px)] md:max-h-96">
              {notifications.length === 0 ? (
                <div className="p-12 md:p-8 text-center text-gray-600">
                  <Bell className="w-16 h-16 md:w-12 md:h-12 mx-auto mb-4 md:mb-3 text-gray-400" />
                  <p className="text-base md:text-sm font-medium text-gray-700">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full p-5 md:p-4 border-b border-purple-100 hover:bg-white/50 active:bg-white/60 transition-all text-left active:scale-[0.99] ${
                      !notification.isRead ? 'bg-digis-cyan/10' : ''
                    }`}
                    style={{ minHeight: '72px' }}
                  >
                    <div className="flex items-start gap-4 md:gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base md:text-sm font-bold text-gray-900 mb-1.5 md:mb-1">{notification.title}</p>
                        <p className="text-sm md:text-sm text-gray-700 leading-relaxed">{notification.message}</p>
                        <p className="text-xs text-gray-600 mt-2 md:mt-1 font-medium">
                          {formatNotificationTime(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2.5 h-2.5 md:w-2 md:h-2 rounded-full bg-digis-cyan flex-shrink-0 mt-2 shadow-lg" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Mobile Bottom Navigation (iPhone Optimized) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        {/* Backdrop with enhanced blur */}
        <div className="absolute inset-0 bg-white/90 backdrop-blur-2xl border-t border-purple-200/60 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]" />

        {/* Navigation content */}
        <div className="relative flex items-end justify-around px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {/* Home */}
          <button
            onClick={() => router.push(navItems[0].path)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[60px] py-2 rounded-2xl transition-all active:scale-95 ${
              navItems[0].active
                ? 'text-digis-cyan'
                : 'text-gray-600 active:bg-gray-100/50'
            }`}
            style={{ minHeight: '56px' }}
          >
            {(() => {
              const Icon = navItems[0].icon;
              return (
                <div className={`relative transition-transform ${navItems[0].active ? 'scale-110' : ''}`}>
                  <Icon className="w-7 h-7" strokeWidth={navItems[0].active ? 2.5 : 2} />
                  {navItems[0].active && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-digis-cyan" />
                  )}
                </div>
              );
            })()}
            <span className={`text-[11px] font-semibold mt-0.5 ${navItems[0].active ? 'text-digis-cyan' : 'text-gray-700'}`}>
              {navItems[0].label}
            </span>
          </button>

          {/* Explore */}
          <button
            onClick={() => router.push(navItems[1].path)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[60px] py-2 rounded-2xl transition-all active:scale-95 ${
              navItems[1].active
                ? 'text-digis-cyan'
                : 'text-gray-600 active:bg-gray-100/50'
            }`}
            style={{ minHeight: '56px' }}
          >
            {(() => {
              const Icon = navItems[1].icon;
              return (
                <div className={`relative transition-transform ${navItems[1].active ? 'scale-110' : ''}`}>
                  <Icon className="w-7 h-7" strokeWidth={navItems[1].active ? 2.5 : 2} />
                  {navItems[1].active && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-digis-cyan" />
                  )}
                </div>
              );
            })()}
            <span className={`text-[11px] font-semibold mt-0.5 ${navItems[1].active ? 'text-digis-cyan' : 'text-gray-700'}`}>
              {navItems[1].label}
            </span>
          </button>

          {/* Center Action Button - Creators Only */}
          {userRole === 'creator' && (
            <div className="flex flex-col items-center justify-end flex-1 min-w-[60px] -mb-2">
              <button
                onClick={() => setShowCreateMenu(true)}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-digis-cyan via-digis-purple to-digis-pink shadow-[0_8px_24px_rgba(0,217,255,0.4)] border-[3px] border-white transition-all active:scale-90 active:shadow-[0_4px_12px_rgba(0,217,255,0.3)] relative overflow-hidden group flex items-center justify-center"
                style={{ minHeight: '64px', minWidth: '64px' }}
              >
                {/* Animated gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-active:opacity-100 transition-opacity" />

                <Plus className="w-8 h-8 text-white relative z-10 transition-transform group-active:rotate-90" strokeWidth={3} />

                {/* Pulse effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink opacity-75 animate-ping" style={{ animationDuration: '2s' }} />
              </button>
            </div>
          )}

          {/* Messages */}
          <button
            onClick={() => router.push(navItems[2].path)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[60px] py-2 rounded-2xl transition-all active:scale-95 ${
              navItems[2].active
                ? 'text-digis-cyan'
                : 'text-gray-600 active:bg-gray-100/50'
            }`}
            style={{ minHeight: '56px' }}
          >
            <div className="relative">
              {(() => {
                const Icon = navItems[2].icon;
                return (
                  <div className={`relative transition-transform ${navItems[2].active ? 'scale-110' : ''}`}>
                    <Icon className="w-7 h-7" strokeWidth={navItems[2].active ? 2.5 : 2} />
                    {navItems[2].active && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-digis-cyan" />
                    )}
                  </div>
                );
              })()}
              {unreadCount > 0 && (
                <div className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                  <span className="text-[10px] font-bold text-white leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </div>
              )}
            </div>
            <span className={`text-[11px] font-semibold mt-0.5 ${navItems[2].active ? 'text-digis-cyan' : 'text-gray-700'}`}>
              {navItems[2].label}
            </span>
          </button>

          {/* Profile/Settings Button */}
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[60px] py-2 rounded-2xl transition-all active:scale-95 ${
              isActive('/settings') || showProfileMenu
                ? 'text-digis-cyan'
                : 'text-gray-600 active:bg-gray-100/50'
            }`}
            style={{ minHeight: '56px' }}
          >
            <div className="relative">
              {/* Enhanced glow effect */}
              {(isActive('/settings') || showProfileMenu) && (
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-digis-cyan via-purple-500 to-digis-pink blur-md opacity-60 animate-pulse" />
              )}

              {/* Gradient border ring */}
              <div className={`relative rounded-full bg-gradient-to-br from-digis-cyan via-purple-500 to-digis-pink p-[2.5px] transition-all ${
                isActive('/settings') || showProfileMenu ? 'scale-110' : ''
              }`}>
                <div className="rounded-full bg-white p-[2px]">
                  {userProfile?.avatarUrl ? (
                    <img
                      src={userProfile.avatarUrl}
                      alt="Your avatar"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-white font-bold text-sm">
                      {user?.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
              </div>

              {(isActive('/settings') || showProfileMenu) && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-digis-cyan" />
              )}
            </div>
            <span className={`text-[11px] font-semibold mt-0.5 ${
              isActive('/settings') || showProfileMenu ? 'text-digis-cyan' : 'text-gray-700'
            }`}>
              You
            </span>
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
          className={`mb-3 relative group transition-all ${
            isActive('/settings') || showProfileMenu
              ? 'scale-110'
              : 'hover:scale-110'
          }`}
          title="Profile Menu"
        >
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-digis-cyan via-purple-500 to-digis-pink blur-md opacity-60 group-hover:opacity-100 animate-pulse" />

          {/* Gradient border ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-digis-cyan via-purple-500 to-digis-pink p-[3px] group-hover:p-[4px] transition-all">
            <div className="w-full h-full rounded-full bg-white p-[2px]">
              {userProfile?.avatarUrl ? (
                <img
                  src={userProfile.avatarUrl}
                  alt="Your avatar"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-lg font-bold text-white">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
          </div>

          {/* Actual size container for proper spacing */}
          <div className="w-14 h-14" />
        </button>

        {/* Balance - Clickable */}
        <button
          onClick={() => router.push('/wallet')}
          className="mb-6 flex flex-col items-center justify-center gap-1 px-3 py-3 bg-gradient-to-br from-green-500/10 to-emerald-500/10 hover:from-green-500/20 hover:to-emerald-500/20 rounded-2xl border-2 border-green-500/30 hover:border-green-500/50 transition-all hover:scale-105 group"
          title="Wallet"
        >
          <Coins className="w-7 h-7 text-green-600 group-hover:rotate-12 transition-transform" />
          <div className="text-xl font-black text-gray-800">
            {balance}
          </div>
        </button>

        {/* Creator Create Button - Canva Style */}
        {userRole === 'creator' && (
          <button
            onClick={() => setShowCreateMenu(true)}
            className="mb-8 w-14 h-14 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink hover:scale-105 transition-all shadow-lg shadow-digis-cyan/50 flex items-center justify-center group"
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
                className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all relative ${
                  item.active
                    ? 'text-digis-cyan scale-105'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-white/20'
                }`}
                title={item.label}
              >
                {/* Small active indicator dot */}
                {item.active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-digis-cyan rounded-r-full" />
                )}
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
          className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all relative ${
            showNotifications
              ? 'text-digis-cyan scale-105'
              : 'text-gray-600 hover:text-gray-800 hover:bg-white/20'
          }`}
          title="Notifications"
        >
          {/* Small active indicator dot */}
          {showNotifications && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-digis-cyan rounded-r-full" />
          )}
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

      {/* Spacer for mobile bottom nav - Dynamic height for iPhone */}
      <div className="md:hidden" style={{ height: 'calc(72px + env(safe-area-inset-bottom))' }} />
    </>
  );
}
