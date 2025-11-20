'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { type Role, ROLE_ORDER, isValidRole, parseRole } from '@/types/auth';
import { getRoleWithFallback } from '@/lib/auth/jwt-utils';
import { clearAppCaches, detectAndHandleUserChange, setLastAuthUserId } from '@/lib/cache-utils';
import {
  Home,
  Search,
  Flame,
  MessageCircle,
  Wallet,
  Video,
  Sparkles,
  Phone,
  Coins,
  Settings,
  Ticket
} from 'lucide-react';

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
  const [showProfileMenu, setShowProfileMenu] = useState(false);

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

      // 🛡️ Detect user change and clear caches if needed
      if (session?.user?.id) {
        const userChanged = detectAndHandleUserChange(session.user.id, { forceReload: true });
        if (userChanged) {
          console.log('[Navigation] User changed - caches cleared and page will reload');
          // Page will reload, so no need to continue
          return;
        }
      }

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
        console.log('[Navigation] User signed out - clearing all caches');
        setUser(null);
        setUserRole('fan');
        setBalance(0);
        // Clear all app caches on logout
        clearAppCaches();
        setLastAuthUserId(null);
      } else if (event === 'SIGNED_IN' && session?.user) {
        console.log('[Navigation] User signed in - checking for user change');
        // Detect user change and clear caches if needed (with force reload)
        const userChanged = detectAndHandleUserChange(session.user.id, { forceReload: true });
        if (userChanged) {
          console.log('[Navigation] User changed on sign-in - page will reload');
          return; // Page will reload
        }
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

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [user]);

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

  const handleLogout = async () => {
    console.log('[Navigation] Logout initiated - clearing all caches');
    const supabase = createClient();

    // Clear all app caches before signing out
    clearAppCaches();
    setLastAuthUserId(null);

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
      label: 'Events',
      icon: Ticket,
      path: '/events',
      active: isActive('/events'),
    },
    {
      label: 'Chats',
      icon: MessageCircle,
      path: '/chats',
      active: isActive('/chats') || pathname?.startsWith('/chats'),
    },
  ];

  if (!user) return null;

  return (
    <>
      {/* Profile Dropdown Menu */}
      {showProfileMenu && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setShowProfileMenu(false)}
          />
          <div className="fixed md:left-24 md:top-20 bottom-[calc(60px+env(safe-area-inset-bottom)+8px)] md:bottom-auto right-4 md:right-auto left-4 md:left-24 md:w-72 backdrop-blur-3xl bg-white/15 border border-white/20 rounded-2xl md:rounded-xl z-50 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.06)] max-h-[calc(100vh-60px-env(safe-area-inset-bottom)-16px)] md:max-h-[calc(100vh-96px)]">
            {/* Profile Header */}
            <div className="p-6 md:p-5 border-b border-white/10 bg-white/0">
              {/* Avatar */}
              <div className="flex items-start gap-4 mb-5 md:mb-4">
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-digis-cyan via-purple-500 to-digis-pink p-[2px]">
                    <div className="w-full h-full rounded-full bg-white p-[2px]">
                      {userProfile?.avatarUrl ? (
                        <img
                          src={userProfile.avatarUrl}
                          alt="Your avatar"
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-white font-bold text-xl md:text-lg">
                          {user?.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Name and Username */}
                <div className="flex-1 min-w-0 pt-1">
                  <h3 className="font-black text-white text-2xl md:text-xl mb-2 truncate drop-shadow-lg">
                    {userProfile?.displayName || userProfile?.username || 'User'}
                  </h3>
                  <button
                    onClick={() => {
                      router.push(`/${userProfile?.username || 'profile'}`);
                      setShowProfileMenu(false);
                    }}
                    className="text-sm md:text-xs text-white/80 hover:text-digis-cyan transition-colors text-left drop-shadow"
                  >
                    @{userProfile?.username || 'user'}
                  </button>
                </div>
              </div>

              {/* Follower Count - Clickable */}
              <button
                onClick={() => {
                  router.push('/creator/followers');
                  setShowProfileMenu(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-3 md:px-3 md:py-2 bg-white/5 hover:bg-white/15 active:bg-white/25 rounded-xl md:rounded-lg transition-all active:scale-98"
                style={{ minHeight: '48px' }}
              >
                <svg className="w-5 h-5 md:w-4 md:h-4 text-white drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-sm font-semibold text-white drop-shadow">
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
                      router.push('/creator/go-live');
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-5 py-4 md:px-4 md:py-3 flex items-center gap-3 hover:bg-white/8 active:bg-white/15 transition-all text-left active:scale-98"
                    style={{ minHeight: '56px' }}
                  >
                    <svg className="w-6 h-6 md:w-5 md:h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="text-base md:text-sm text-red-500 font-bold">Go Live</span>
                  </button>

                  <button
                    onClick={() => {
                      router.push('/creator/content/new');
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-5 py-4 md:px-4 md:py-3 flex items-center gap-3 hover:bg-white/8 active:bg-white/15 transition-all text-left active:scale-98"
                    style={{ minHeight: '56px' }}
                  >
                    <svg className="w-6 h-6 md:w-5 md:h-5 text-white drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-base md:text-sm text-white font-semibold drop-shadow">Create</span>
                  </button>

                  <button
                    onClick={() => {
                      router.push('/creator/shows');
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-5 py-4 md:px-4 md:py-3 flex items-center gap-3 hover:bg-white/8 active:bg-white/15 transition-all text-left active:scale-98"
                    style={{ minHeight: '56px' }}
                  >
                    <svg className="w-6 h-6 md:w-5 md:h-5 text-white drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                    <span className="text-base md:text-sm text-white font-semibold drop-shadow">Shows</span>
                  </button>

                  <button
                    onClick={() => {
                      router.push('/calls/history');
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-5 py-4 md:px-4 md:py-3 flex items-center gap-3 hover:bg-white/8 active:bg-white/15 transition-all text-left active:scale-98 border-t border-purple-100"
                    style={{ minHeight: '56px' }}
                  >
                    <svg className="w-6 h-6 md:w-5 md:h-5 text-white drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-base md:text-sm text-white font-semibold drop-shadow">Calls</span>
                  </button>
                </>
              )}

              <button
                onClick={() => {
                  router.push('/settings');
                  setShowProfileMenu(false);
                }}
                className="w-full px-5 py-4 md:px-4 md:py-3 flex items-center gap-3 hover:bg-white/8 active:bg-white/15 transition-all text-left border-t border-purple-100 active:scale-98"
                style={{ minHeight: '56px' }}
              >
                <Settings className="w-6 h-6 md:w-5 md:h-5 text-white drop-shadow" />
                <span className="text-base md:text-sm text-white font-semibold drop-shadow">Settings</span>
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
                <span className="text-base md:text-sm text-red-600 font-bold">Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Mobile Bottom Navigation (iPhone Optimized) - Ultra Transparent */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        {/* Backdrop with ultra transparent glass effect */}
        <div className="absolute inset-0 bg-white/15 backdrop-blur-3xl border-t border-white/20 shadow-[0_-2px_16px_rgba(0,0,0,0.06)]" />

        {/* Navigation content */}
        <div className="relative flex items-end justify-around px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
          {/* Home */}
          <button
            onClick={() => router.push(navItems[0].path)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[60px] py-1.5 rounded-2xl transition-all active:scale-95 ${
              navItems[0].active
                ? 'text-digis-cyan'
                : 'text-white/90 active:bg-white/10'
            }`}
            style={{ minHeight: '48px' }}
          >
            {(() => {
              const Icon = navItems[0].icon;
              return (
                <div className={`relative transition-transform ${navItems[0].active ? 'scale-110' : ''}`}>
                  <Icon className="w-6 h-6" strokeWidth={navItems[0].active ? 2.5 : 2} />
                  {navItems[0].active && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-digis-cyan" />
                  )}
                </div>
              );
            })()}
            <span className={`text-[11px] font-semibold mt-0.5 ${navItems[0].active ? 'text-digis-cyan' : 'text-white drop-shadow'}`}>
              {navItems[0].label}
            </span>
          </button>

          {/* Explore */}
          <button
            onClick={() => router.push(navItems[1].path)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[60px] py-1.5 rounded-2xl transition-all active:scale-95 ${
              navItems[1].active
                ? 'text-digis-cyan'
                : 'text-white/90 active:bg-white/10'
            }`}
            style={{ minHeight: '48px' }}
          >
            {(() => {
              const Icon = navItems[1].icon;
              return (
                <div className={`relative transition-transform ${navItems[1].active ? 'scale-110' : ''}`}>
                  <Icon className="w-6 h-6" strokeWidth={navItems[1].active ? 2.5 : 2} />
                  {navItems[1].active && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-digis-cyan" />
                  )}
                </div>
              );
            })()}
            <span className={`text-[11px] font-semibold mt-0.5 ${navItems[1].active ? 'text-digis-cyan' : 'text-white drop-shadow'}`}>
              {navItems[1].label}
            </span>
          </button>

          {/* Center Profile Button */}
          <div className="flex flex-col items-center justify-center flex-1 min-w-[60px] -mt-4">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="relative transition-all active:scale-95"
              style={{ minHeight: '56px', minWidth: '56px' }}
            >
              {/* Enhanced glow effect */}
              {(isActive('/settings') || showProfileMenu) && (
                <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-digis-cyan via-purple-500 to-digis-pink blur-lg opacity-60 animate-pulse" />
              )}

              {/* Gradient border ring */}
              <div className={`relative rounded-full bg-gradient-to-br from-digis-cyan via-purple-500 to-digis-pink p-[3px] shadow-lg transition-all ${
                isActive('/settings') || showProfileMenu ? 'scale-110' : ''
              }`}>
                <div className="rounded-full bg-white p-[2px]">
                  {userProfile?.avatarUrl ? (
                    <img
                      src={userProfile.avatarUrl}
                      alt="Your avatar"
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-white font-bold text-lg">
                      {user?.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
              </div>
            </button>
          </div>

          {/* Events */}
          <button
            onClick={() => router.push(navItems[2].path)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[60px] py-1.5 rounded-2xl transition-all active:scale-95 ${
              navItems[2].active
                ? 'text-digis-cyan'
                : 'text-white/90 active:bg-white/10'
            }`}
            style={{ minHeight: '48px' }}
          >
            {(() => {
              const Icon = navItems[2].icon;
              return (
                <div className={`relative transition-transform ${navItems[2].active ? 'scale-110' : ''}`}>
                  <Icon className="w-6 h-6" strokeWidth={navItems[2].active ? 2.5 : 2} />
                  {navItems[2].active && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-digis-cyan" />
                  )}
                </div>
              );
            })()}
            <span className={`text-[11px] font-semibold mt-0.5 ${navItems[2].active ? 'text-digis-cyan' : 'text-white drop-shadow'}`}>
              {navItems[2].label}
            </span>
          </button>

          {/* Messages/Chats */}
          <button
            onClick={() => router.push(navItems[3].path)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[60px] py-1.5 rounded-2xl transition-all active:scale-95 ${
              navItems[3].active
                ? 'text-digis-cyan'
                : 'text-white/90 active:bg-white/10'
            }`}
            style={{ minHeight: '48px' }}
          >
            <div className="relative">
              {(() => {
                const Icon = navItems[3].icon;
                return (
                  <div className={`relative transition-transform ${navItems[3].active ? 'scale-110' : ''}`}>
                    <Icon className="w-6 h-6" strokeWidth={navItems[3].active ? 2.5 : 2} />
                    {navItems[3].active && (
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
            <span className={`text-[11px] font-semibold mt-0.5 ${navItems[3].active ? 'text-digis-cyan' : 'text-white drop-shadow'}`}>
              {navItems[3].label}
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
          <div className="text-xl font-black text-white drop-shadow-lg">
            {balance}
          </div>
        </button>

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
                    ? 'text-digis-cyan scale-105'
                    : 'text-white/90 hover:text-white hover:bg-white/20'
                }`}
                title={item.label}
              >
                {/* Small active indicator dot */}
                {item.active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-digis-cyan rounded-r-full" />
                )}
                <div className="relative">
                  <IconComponent className="w-6 h-6" />
                  {item.label === 'Chats' && unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
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
    </>
  );
}
