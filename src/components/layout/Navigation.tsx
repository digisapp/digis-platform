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

export function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('fan');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3); // Mock count for now
  const [showCreateMenu, setShowCreateMenu] = useState(false);

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

    // Subscribe to real-time message updates
    const supabase = createClient();
    const channel = supabase
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
      supabase.removeChannel(channel);
    };
  }, [user]);

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

  // Mock notifications - replace with real data later
  const mockNotifications = [
    { id: 1, type: 'message', text: 'New message from @creator', time: '5m ago', read: false },
    { id: 2, type: 'tip', text: 'You received 50 coins!', time: '1h ago', read: false },
    { id: 3, type: 'like', text: '@fan liked your content', time: '2h ago', read: false },
    { id: 4, type: 'system', text: 'Welcome to Digis!', time: '1d ago', read: true },
  ];

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

      {/* Notification Dropdown */}
      {showNotifications && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setShowNotifications(false)}
          />
          <div className="fixed md:left-24 md:bottom-24 bottom-20 right-4 md:right-auto glass backdrop-blur-xl border border-purple-200 rounded-xl z-50 w-80 max-h-96 overflow-hidden shadow-lg">
            {/* Header */}
            <div className="p-4 border-b border-purple-200 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Notifications</h3>
              <button
                onClick={() => setShowNotifications(false)}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-80">
              {mockNotifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => setShowNotifications(false)}
                  className={`w-full p-4 border-b border-purple-100 hover:bg-white/40 transition-colors text-left ${
                    !notif.read ? 'bg-digis-cyan/10' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {notif.type === 'message' && <MessageCircle className="w-5 h-5 text-digis-cyan" />}
                      {notif.type === 'tip' && <Wallet className="w-5 h-5 text-yellow-500" />}
                      {notif.type === 'like' && <Flame className="w-5 h-5 text-red-500" />}
                      {notif.type === 'system' && <Bell className="w-5 h-5 text-gray-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">{notif.text}</p>
                      <p className="text-xs text-gray-600 mt-1">{notif.time}</p>
                    </div>
                    {!notif.read && (
                      <div className="w-2 h-2 rounded-full bg-digis-cyan flex-shrink-0 mt-2" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-purple-200 bg-white/60">
              <button className="w-full text-center text-sm text-digis-cyan hover:text-digis-pink transition-colors font-semibold">
                View all notifications
              </button>
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
            onClick={() => {
              console.log('[Navigation] Mobile profile button clicked');
              router.push('/settings');
            }}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
              isActive('/settings') ? 'text-digis-cyan' : 'text-gray-600'
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
          className="mb-4 hover:scale-110 transition-transform flex items-center justify-center"
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
          onClick={() => {
            console.log('[Navigation] Profile button clicked, navigating to /settings');
            router.push('/settings');
          }}
          className={`mb-3 w-12 h-12 rounded-full transition-all ${
            isActive('/settings')
              ? 'scale-110 ring-2 ring-digis-cyan ring-offset-2 ring-offset-white'
              : 'hover:scale-110'
          }`}
          title="Settings"
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
            className="mb-8 w-14 h-14 rounded-xl bg-gradient-to-br from-digis-cyan to-digis-pink hover:scale-110 transition-all shadow-lg shadow-digis-cyan/50 flex items-center justify-center group"
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
                    ? 'bg-digis-cyan/20 text-digis-cyan scale-110'
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
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-red-500/20 to-pink-500/20 border border-red-500 hover:scale-110 transition-transform"
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
              ? 'bg-digis-cyan/20 text-digis-cyan scale-110'
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
