'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { clearAppCaches, setLastAuthUserId } from '@/lib/cache-utils';
import { useAuth } from '@/context/AuthContext';
import {
  Home,
  Search,
  MessageCircle,
  Wallet,
  Video,
  Sparkles,
  Phone,
  Coins,
  Settings,
  Ticket,
  Radio,
  Upload
} from 'lucide-react';
import { BuyCoinsModal } from '@/components/wallet/BuyCoinsModal';

// Format large coin numbers (1000 -> 1k, 2500 -> 2.5k, 1000000 -> 1M)
const formatCoinBalance = (coins: number | null): string => {
  if (coins === null) return '—';
  if (coins >= 1000000) {
    const millions = coins / 1000000;
    return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`;
  }
  if (coins >= 1000) {
    const thousands = coins / 1000;
    return thousands % 1 === 0 ? `${thousands}k` : `${thousands.toFixed(1)}k`;
  }
  return coins.toString();
};

export function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { user: authUser, session, loading: authLoading, isCreator, isAdmin } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showCoinsMenu, setShowCoinsMenu] = useState(false);
  const [showBuyCoinsModal, setShowBuyCoinsModal] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [liveStreamId, setLiveStreamId] = useState<string | null>(null);

  // Derive userRole from AuthContext (trusts JWT first) - don't rely solely on profile
  const userRole = isAdmin ? 'admin' : isCreator ? 'creator' : 'fan';

  // Use auth metadata as fallbacks when profile API is slow/failing
  const sessionMeta = session?.user?.user_metadata as Record<string, any> | undefined;
  const avatarUrl = userProfile?.avatarUrl || sessionMeta?.avatar_url || authUser?.avatarUrl || null;
  const displayName = userProfile?.displayName || sessionMeta?.display_name || authUser?.displayName || authUser?.username || 'User';
  const username = userProfile?.username || sessionMeta?.username || authUser?.username || 'user';

  // Fetch all startup data in parallel when auth user changes
  useEffect(() => {
    if (!authUser) return;

    const fetchStartupData = async () => {
      // Create abort controller with 5s timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        // Fetch profile, balance, unread count, and live status in parallel with timeout
        const [profileRes, balanceRes, unreadRes, liveRes] = await Promise.all([
          fetch('/api/user/profile', { cache: 'no-store', signal: controller.signal }),
          fetch('/api/wallet/balance', { signal: controller.signal }),
          fetch('/api/messages/unread-count', { signal: controller.signal }),
          fetch('/api/streams/status', { signal: controller.signal }).catch(() => null)
        ]);

        clearTimeout(timeoutId);

        // Process profile
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData?.user) {
            setUserProfile(profileData.user);
            setFollowerCount(profileData.user.followerCount ?? 0);
          }
        }

        // Process balance
        if (balanceRes.ok) {
          const balanceData = await balanceRes.json();
          setBalance(balanceData.balance ?? 0);
        }

        // Process unread count
        if (unreadRes.ok) {
          const unreadData = await unreadRes.json();
          setUnreadCount(unreadData.count || 0);
        }

        // Process live status (for creators)
        if (liveRes?.ok) {
          const liveData = await liveRes.json();
          setIsLive(liveData.isLive || false);
          setLiveStreamId(liveData.streamId || null);
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name !== 'AbortError') {
          console.error('[Navigation] Error fetching startup data:', error);
        }
      }
    };

    fetchStartupData();

    // Prefetch common pages so they load instantly when tapped
    router.prefetch('/explore');
    router.prefetch('/live');
    router.prefetch('/chats');
    router.prefetch('/settings');
    router.prefetch('/wallet');
    router.prefetch('/creator/go-stream');
  }, [authUser?.id, router]);

  // Heartbeat and auth state listener for cache clearing
  useEffect(() => {
    // Heartbeat to keep session alive (every 60 seconds)
    const heartbeatInterval = setInterval(() => {
      fetch('/api/auth/heartbeat', {
        method: 'POST',
        cache: 'no-store'
      }).catch(() => {
        // Silently fail
      });
    }, 60000);

    // Listen for auth state changes for cache clearing
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        console.log('[Navigation] User signed out - clearing all caches');
        setBalance(0);
        clearAppCaches();
        setLastAuthUserId(null);
      }
    });

    return () => {
      clearInterval(heartbeatInterval);
      subscription.unsubscribe();
    };
  }, []);

  // Subscribe to real-time updates for unread count changes
  useEffect(() => {
    if (!authUser) return;

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

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [authUser]);

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

  const handleLogout = async () => {
    console.log('[Navigation] Logout initiated - clearing all caches');
    const supabase = createClient();

    // Clear all app caches before signing out
    clearAppCaches();
    setLastAuthUserId(null);

    await supabase.auth.signOut();
    router.push('/');
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  // Define arrays before early return
  // Creators: Home, Go Live, Upload, Chats (focused on creating and earning)
  // Fans: Home, Explore, Streams, Chats (full discovery experience)
  const navItems = userRole === 'creator' ? [
    {
      label: 'Home',
      icon: Home,
      path: '/creator/dashboard',
      active: isActive('/creator/dashboard'),
    },
    {
      label: 'Go Live',
      icon: Radio,
      path: '/creator/go-stream',
      active: isActive('/creator/go-stream'),
    },
    {
      label: 'Upload',
      icon: Upload,
      path: '/creator/content/new',
      active: isActive('/creator/content/new') || isActive('/creator/content'),
    },
    {
      label: 'Chats',
      icon: MessageCircle,
      path: '/chats',
      active: isActive('/chats') || pathname?.startsWith('/chats'),
    },
  ] : [
    {
      label: 'Home',
      icon: Home,
      path: userRole === 'admin' ? '/admin' : '/dashboard',
      active: isActive('/dashboard') || isActive('/admin'),
    },
    {
      label: 'Explore',
      icon: Search,
      path: '/explore',
      active: isActive('/explore') || pathname?.startsWith('/profile'),
    },
    {
      label: 'Streams',
      icon: Video,
      path: '/live',
      active: isActive('/live') || isActive('/streams'),
    },
    {
      label: 'Chats',
      icon: MessageCircle,
      path: '/chats',
      active: isActive('/chats') || pathname?.startsWith('/chats'),
    },
  ];

  // Don't show navigation while loading or if no user
  if (authLoading || !authUser) return null;

  return (
    <>
      {/* Profile Dropdown Menu */}
      {showProfileMenu && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setShowProfileMenu(false)}
          />
          <div className="fixed md:left-24 md:top-20 bottom-[calc(60px+env(safe-area-inset-bottom)+8px)] md:bottom-auto right-4 md:right-auto left-4 md:left-24 md:w-72 backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 border-2 border-cyan-500/30 rounded-2xl md:rounded-xl z-50 overflow-hidden shadow-[0_0_50px_rgba(34,211,238,0.3)] max-h-[calc(100vh-60px-env(safe-area-inset-bottom)-16px)] md:max-h-[calc(100vh-96px)]">
            {/* Animated gradient border effect */}
            <div className="absolute inset-0 rounded-2xl md:rounded-xl overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/20 to-cyan-500/0 animate-shimmer" style={{animation: 'shimmer 3s infinite'}} />
            </div>

            {/* Profile Header */}
            <div className="p-6 md:p-5 border-b border-cyan-500/20 bg-transparent relative">
              {/* Avatar */}
              <div className="flex items-start gap-4 mb-5 md:mb-4">
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-digis-cyan via-purple-500 to-digis-pink p-[2px]">
                    <div className="w-full h-full rounded-full bg-white p-[2px]">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Your avatar"
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-white font-bold text-xl md:text-lg">
                          {displayName?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Name and Username */}
                <div className="flex-1 min-w-0 pt-1">
                  <h3 className="font-black bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent text-2xl md:text-xl mb-2 truncate">
                    {displayName}
                  </h3>
                  <button
                    onClick={() => {
                      router.push(`/${username}`);
                      setShowProfileMenu(false);
                    }}
                    className="text-sm md:text-xs text-cyan-400 hover:text-cyan-300 transition-colors text-left truncate max-w-full"
                  >
                    digis.cc/{username}
                  </button>
                </div>
              </div>

              {/* Follower Count - Creators go to /creator/followers, Fans go to /connections */}
              <button
                onClick={() => {
                  router.push(userRole === 'creator' ? '/creator/followers' : '/connections');
                  setShowProfileMenu(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-3 md:px-3 md:py-2 bg-white/5 hover:bg-white/10 active:bg-white/15 border border-cyan-500/20 rounded-xl md:rounded-lg transition-all active:scale-98"
                style={{ minHeight: '48px' }}
              >
                <svg className="w-5 h-5 md:w-4 md:h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-sm font-semibold text-white">
                  {userRole === 'creator'
                    ? followerCount !== null
                      ? `${followerCount.toLocaleString()} ${followerCount === 1 ? 'Follower' : 'Followers'}`
                      : '— Followers'
                    : 'Following'
                  }
                </span>
              </button>
            </div>

            {/* Menu Items */}
            <div className="py-2 relative">
              {userRole === 'creator' && (
                <>
                  <button
                    onClick={() => {
                      router.push('/creator/go-stream');
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-5 py-4 md:px-4 md:py-3 flex items-center gap-3 hover:bg-white/5 active:bg-white/10 transition-all text-left active:scale-98"
                    style={{ minHeight: '56px' }}
                  >
                    <svg className="w-6 h-6 md:w-5 md:h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="text-base md:text-sm text-red-400 font-bold">Go Live</span>
                  </button>

                  <button
                    onClick={() => {
                      router.push('/creator/content/new');
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-5 py-4 md:px-4 md:py-3 flex items-center gap-3 hover:bg-white/5 active:bg-white/10 transition-all text-left active:scale-98"
                    style={{ minHeight: '56px' }}
                  >
                    <svg className="w-6 h-6 md:w-5 md:h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span className="text-base md:text-sm text-white font-semibold">Upload</span>
                  </button>

                  <button
                    onClick={() => {
                      router.push('/creator/content');
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-5 py-4 md:px-4 md:py-3 flex items-center gap-3 hover:bg-white/5 active:bg-white/10 transition-all text-left active:scale-98"
                    style={{ minHeight: '56px' }}
                  >
                    <svg className="w-6 h-6 md:w-5 md:h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span className="text-base md:text-sm text-white font-semibold">My Content</span>
                  </button>

                  <button
                    onClick={() => {
                      router.push('/creator/calls');
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-5 py-4 md:px-4 md:py-3 flex items-center gap-3 hover:bg-white/5 active:bg-white/10 transition-all text-left active:scale-98"
                    style={{ minHeight: '56px' }}
                  >
                    <svg className="w-6 h-6 md:w-5 md:h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-base md:text-sm text-white font-semibold">Calls</span>
                  </button>
                </>
              )}

              {userRole === 'fan' && (
                <>
                  <button
                    onClick={() => {
                      router.push('/live');
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-5 py-4 md:px-4 md:py-3 flex items-center gap-3 hover:bg-white/5 active:bg-white/10 transition-all text-left active:scale-98"
                    style={{ minHeight: '56px' }}
                  >
                    <Video className="w-6 h-6 md:w-5 md:h-5 text-gray-300" />
                    <span className="text-base md:text-sm text-white font-semibold">Streams</span>
                  </button>

                  <button
                    onClick={() => {
                      router.push('/streams/my-tickets');
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-5 py-4 md:px-4 md:py-3 flex items-center gap-3 hover:bg-white/5 active:bg-white/10 transition-all text-left active:scale-98"
                    style={{ minHeight: '56px' }}
                  >
                    <Ticket className="w-6 h-6 md:w-5 md:h-5 text-gray-300" />
                    <span className="text-base md:text-sm text-white font-semibold">My Tickets</span>
                  </button>

                  <button
                    onClick={() => {
                      router.push('/content/library');
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-5 py-4 md:px-4 md:py-3 flex items-center gap-3 hover:bg-white/5 active:bg-white/10 transition-all text-left active:scale-98"
                    style={{ minHeight: '56px' }}
                  >
                    <svg className="w-6 h-6 md:w-5 md:h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span className="text-base md:text-sm text-white font-semibold">My Content</span>
                  </button>

                </>
              )}

              <button
                onClick={() => {
                  router.push('/settings');
                  setShowProfileMenu(false);
                }}
                className="w-full px-5 py-4 md:px-4 md:py-3 flex items-center gap-3 hover:bg-white/5 active:bg-white/10 transition-all text-left border-t border-cyan-500/20 active:scale-98"
                style={{ minHeight: '56px' }}
              >
                <Settings className="w-6 h-6 md:w-5 md:h-5 text-gray-300" />
                <span className="text-base md:text-sm text-white font-semibold">Settings</span>
              </button>

              <button
                onClick={() => {
                  handleLogout();
                  setShowProfileMenu(false);
                }}
                className="w-full px-5 py-4 md:px-4 md:py-3 flex items-center gap-3 hover:bg-red-500/10 active:bg-red-500/20 transition-all text-left border-t border-cyan-500/20 active:scale-98"
                style={{ minHeight: '56px' }}
              >
                <svg className="w-6 h-6 md:w-5 md:h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="text-base md:text-sm text-red-400 font-bold">Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}

      
      {/* Mobile Bottom Navigation (iPhone Optimized) - Dark Tron Theme */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        {/* Tron-themed background - pointer-events-none to not block touches */}
        <div className="absolute inset-0 bg-black/95 backdrop-blur-xl pointer-events-none" />

        {/* Animated gradient line at top - pointer-events-none to not block touches */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-cyan-500/0 via-cyan-400 to-cyan-500/0 shadow-[0_0_20px_rgba(34,211,238,0.8),0_0_40px_rgba(34,211,238,0.4)] pointer-events-none" />

        {/* Navigation content */}
        <div className="relative flex items-end justify-around px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
          {/* First nav item (Home) */}
          <button
            onClick={() => router.push(navItems[0].path)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[60px] py-1.5 rounded-2xl touch-manipulation ${
              navItems[0].active
                ? 'text-cyan-400'
                : 'text-gray-300'
            }`}
            style={{ minHeight: '48px' }}
          >
            {(() => {
              const Icon = navItems[0].icon;
              return (
                <div className={`relative transition-transform ${navItems[0].active ? 'scale-110' : ''}`}>
                  <Icon className="w-6 h-6" strokeWidth={navItems[0].active ? 2.5 : 2} />
                  {navItems[0].active && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                  )}
                </div>
              );
            })()}
            <span className={`text-[11px] font-semibold mt-0.5 ${navItems[0].active ? 'text-cyan-400' : 'text-gray-300'}`}>
              {navItems[0].label}
            </span>
          </button>

          {/* Second nav item (Calls for creators, Explore for fans) */}
          <button
            onClick={() => router.push(navItems[1].path)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[60px] py-1.5 rounded-2xl touch-manipulation ${
              navItems[1].active
                ? 'text-cyan-400'
                : 'text-gray-300'
            }`}
            style={{ minHeight: '48px' }}
          >
            {(() => {
              const Icon = navItems[1].icon;
              return (
                <div className={`relative transition-transform ${navItems[1].active ? 'scale-110' : ''}`}>
                  <Icon className="w-6 h-6" strokeWidth={navItems[1].active ? 2.5 : 2} />
                  {navItems[1].active && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                  )}
                </div>
              );
            })()}
            <span className={`text-[11px] font-semibold mt-0.5 ${navItems[1].active ? 'text-cyan-400' : 'text-gray-300'}`}>
              {navItems[1].label}
            </span>
          </button>

          {/* Center Button - Profile for all users */}
          <div className="flex flex-col items-center justify-center flex-1 min-w-[60px] -mt-4">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="relative touch-manipulation"
              style={{ minHeight: '56px', minWidth: '56px' }}
            >
              {/* Enhanced glow effect */}
              {(isActive('/settings') || showProfileMenu) && (
                <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-digis-cyan via-purple-500 to-digis-pink blur-lg opacity-60 animate-pulse pointer-events-none" />
              )}

              {/* Live indicator ring for creators who are live */}
              {userRole === 'creator' && isLive && (
                <div className="absolute -inset-1 rounded-full bg-red-500 blur-md opacity-70 animate-pulse pointer-events-none" />
              )}

              {/* Gradient border ring */}
              <div className={`relative rounded-full p-[3px] shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all ${
                userRole === 'creator' && isLive
                  ? 'bg-red-500 animate-pulse shadow-[0_0_25px_rgba(239,68,68,0.7)]'
                  : 'bg-gradient-to-br from-digis-cyan via-purple-500 to-digis-pink'
              } ${isActive('/settings') || showProfileMenu ? 'scale-110 shadow-[0_0_30px_rgba(34,211,238,0.7)]' : ''}`}>
                <div className="rounded-full bg-gray-900 p-[2px]">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Your avatar"
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-white font-bold text-lg">
                      {displayName?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
              </div>

              {/* LIVE badge for creators who are live */}
              {userRole === 'creator' && isLive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-lg">
                  LIVE
                </div>
              )}
            </button>
          </div>

          {/* Third nav item (Streams for fans only - 4 items) */}
          {navItems.length > 3 && (
            <button
              onClick={() => router.push(navItems[2].path)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[60px] py-1.5 rounded-2xl touch-manipulation ${
                navItems[2].active
                  ? 'text-cyan-400'
                  : 'text-gray-300'
              }`}
              style={{ minHeight: '48px' }}
            >
              {(() => {
                const Icon = navItems[2].icon;
                return (
                  <div className={`relative transition-transform ${navItems[2].active ? 'scale-110' : ''}`}>
                    <Icon className="w-6 h-6" strokeWidth={navItems[2].active ? 2.5 : 2} />
                    {navItems[2].active && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                    )}
                  </div>
                );
              })()}
              <span className={`text-[11px] font-semibold mt-0.5 ${navItems[2].active ? 'text-cyan-400' : 'text-gray-300'}`}>
                {navItems[2].label}
              </span>
            </button>
          )}

          {/* Last nav item (Chats) - index 2 for creators, index 3 for fans */}
          <button
            onClick={() => router.push(navItems[navItems.length - 1].path)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[60px] py-1.5 rounded-2xl touch-manipulation ${
              navItems[navItems.length - 1].active
                ? 'text-cyan-400'
                : 'text-gray-300'
            }`}
            style={{ minHeight: '48px' }}
          >
            <div className="relative">
              {(() => {
                const Icon = navItems[navItems.length - 1].icon;
                return (
                  <div className={`relative transition-transform ${navItems[navItems.length - 1].active ? 'scale-110' : ''}`}>
                    <Icon className="w-6 h-6" strokeWidth={navItems[navItems.length - 1].active ? 2.5 : 2} />
                    {navItems[navItems.length - 1].active && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                    )}
                  </div>
                );
              })()}
              {unreadCount > 0 && (
                <div className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg border-2 border-black/40">
                  <span className="text-[10px] font-bold text-white leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </div>
              )}
            </div>
            <span className={`text-[11px] font-semibold mt-0.5 ${navItems[navItems.length - 1].active ? 'text-cyan-400' : 'text-gray-300'}`}>
              {navItems[navItems.length - 1].label}
            </span>
          </button>
        </div>
      </nav>

      {/* Desktop Side Navigation */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 backdrop-blur-2xl bg-gradient-to-b from-black/40 via-gray-900/60 to-black/40 border-r-2 border-cyan-500/30 flex-col items-center py-6 z-50 shadow-[0_0_50px_rgba(34,211,238,0.2)]">
        {/* Logo */}
        <button
          onClick={() => router.push(userRole === 'admin' ? '/admin' : userRole === 'creator' ? '/creator/dashboard' : '/dashboard')}
          className="mb-4 hover:scale-105 transition-transform flex items-center justify-center relative group"
          title="Home"
        >
          <div className="absolute inset-0 bg-cyan-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
          <Image
            src="/images/digis-logo-white.png"
            alt="Digis Logo"
            width={48}
            height={48}
            className="w-12 h-auto relative"
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
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-digis-cyan via-purple-500 to-digis-pink p-[3px] group-hover:p-[4px] transition-all shadow-[0_0_20px_rgba(34,211,238,0.5)]">
            <div className="w-full h-full rounded-full bg-gray-900 p-[2px]">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Your avatar"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-lg font-bold text-white">
                  {displayName?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
          </div>

          {/* Actual size container for proper spacing */}
          <div className="w-14 h-14" />
        </button>

        {/* Balance - Creators go to wallet, Fans see Buy Coins */}
        <div className="relative mb-6">
          <button
            onClick={() => {
              if (userRole === 'creator') {
                router.push('/wallet');
              } else {
                setShowCoinsMenu(!showCoinsMenu);
              }
            }}
            className="flex flex-col items-center justify-center gap-1 px-3 py-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 rounded-2xl border-2 border-green-500/40 hover:border-green-500/60 transition-all hover:scale-105 group shadow-[0_0_20px_rgba(34,197,94,0.3)]"
            title={userRole === 'creator' ? 'Wallet' : 'Buy Coins'}
          >
            <Coins className="w-7 h-7 text-green-400 group-hover:rotate-12 transition-transform" />
            <div className="text-base font-bold text-white drop-shadow-lg">
              {formatCoinBalance(balance)}
            </div>
          </button>

          {/* Coins Dropdown Menu - Only for fans */}
          {showCoinsMenu && userRole !== 'creator' && (
            <>
              <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
                onClick={() => setShowCoinsMenu(false)}
              />
              <div className="fixed md:absolute md:left-full md:top-0 md:ml-2 bottom-[calc(60px+env(safe-area-inset-bottom)+8px)] md:bottom-auto right-4 md:right-auto left-4 md:left-auto md:w-52 backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 border-2 border-cyan-500/30 rounded-2xl md:rounded-xl z-50 overflow-hidden shadow-[0_0_50px_rgba(34,211,238,0.3)]">
                {/* Animated gradient border effect */}
                <div className="absolute inset-0 rounded-2xl md:rounded-xl overflow-hidden pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/20 to-cyan-500/0 animate-shimmer" style={{animation: 'shimmer 3s infinite'}} />
                </div>

                {/* Balance Header */}
                <div className="px-4 py-3 border-b border-green-500/20 relative">
                  <div className="text-center">
                    <div className="text-2xl font-black text-green-400">
                      {balance !== null ? balance.toLocaleString() : '—'}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">Coins</div>
                  </div>
                </div>

                {/* Buy Coins Button */}
                <div className="p-2 relative">
                  <button
                    onClick={() => {
                      setShowCoinsMenu(false);
                      setShowBuyCoinsModal(true);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 active:bg-white/10 transition-all text-left active:scale-98 rounded-xl"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                      <Coins className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-base text-white font-semibold">Buy Coins</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Go Live Button for Creators */}
        {userRole === 'creator' && (
          <button
            onClick={() => {
              if (isLive && liveStreamId) {
                router.push(`/stream/live/${liveStreamId}`);
              } else {
                router.push('/creator/go-stream');
              }
            }}
            className="relative mb-4 group"
            title={isLive ? 'View Your Stream' : 'Go Live'}
          >
            {/* Glow effect */}
            <div className={`absolute -inset-2 rounded-2xl blur-lg opacity-60 group-hover:opacity-80 transition-opacity pointer-events-none ${
              isLive ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-br from-red-500 via-orange-500 to-red-500'
            }`} />

            {/* Button */}
            <div className={`relative flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all ${
              isLive
                ? 'bg-red-500 animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.6)]'
                : 'bg-gradient-to-br from-red-500 to-orange-500 hover:scale-105 shadow-[0_0_25px_rgba(239,68,68,0.5)]'
            }`}>
              {isLive ? (
                <>
                  <div className="w-4 h-4 bg-white rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-white">LIVE</span>
                </>
              ) : (
                <>
                  <Radio className="w-6 h-6 text-white" />
                  <span className="text-[10px] font-bold text-white">Go Live</span>
                </>
              )}
            </div>
          </button>
        )}

        {/* Navigation Items */}
        <div className="flex-1 flex flex-col gap-2">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all relative ${
                  item.active
                    ? 'text-cyan-400 scale-105 bg-cyan-500/10 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
                title={item.label}
              >
                {/* Small active indicator line */}
                {item.active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-400 rounded-r-full shadow-[0_0_10px_rgba(34,211,238,0.6)]" />
                )}
                <div className="relative">
                  <IconComponent className="w-6 h-6" />
                  {item.label === 'Chats' && unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Spacer for desktop side nav */}
      <div className="hidden md:block w-20" />

      {/* Spacer for mobile bottom nav - Dynamic height for iPhone */}
      <div className="md:hidden" style={{ height: 'calc(60px + env(safe-area-inset-bottom))' }} />

      {/* Buy Coins Modal */}
      <BuyCoinsModal
        isOpen={showBuyCoinsModal}
        onClose={() => setShowBuyCoinsModal(false)}
        onSuccess={() => {
          setShowBuyCoinsModal(false);
          fetchBalance();
        }}
      />
    </>
  );
}
