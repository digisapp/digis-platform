'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Home,
  Search,
  Flame,
  MessageCircle,
  Wallet,
  Video,
  Sparkles
} from 'lucide-react';

export function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('fan');
  const [balance, setBalance] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const init = async () => {
      await checkUser();
    };
    init();
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

      // Get user role
      const response = await fetch('/api/user/profile');
      const data = await response.json();
      if (data.user?.role) {
        setUserRole(data.user.role);
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
    router.push('/');
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  if (!user) return null;

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
      label: 'Content',
      icon: Flame,
      path: '/content',
      active: isActive('/content') || pathname?.startsWith('/content'),
    },
    // Center button will be here
    {
      label: 'Messages',
      icon: MessageCircle,
      path: '/messages',
      active: isActive('/messages') || pathname?.startsWith('/messages'),
    },
    {
      label: 'Wallet',
      icon: Wallet,
      path: '/wallet',
      active: isActive('/wallet'),
    },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation (TikTok/Instagram style) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-black/95 backdrop-blur-xl border-t border-white/10 pb-safe">
        <div className="flex items-center justify-around h-16 px-2">
          {/* Home */}
          <button
            onClick={() => router.push(navItems[0].path)}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
              navItems[0].active ? 'text-digis-cyan' : 'text-gray-400'
            }`}
          >
            <navItems[0].icon className="w-6 h-6" />
            <span className="text-xs font-medium">{navItems[0].label}</span>
          </button>

          {/* Explore */}
          <button
            onClick={() => router.push(navItems[1].path)}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
              navItems[1].active ? 'text-digis-cyan' : 'text-gray-400'
            }`}
          >
            <navItems[1].icon className="w-6 h-6" />
            <span className="text-xs font-medium">{navItems[1].label}</span>
          </button>

          {/* Center Action Button */}
          {userRole === 'creator' ? (
            <button
              onClick={() => router.push('/creator/go-live')}
              className="flex flex-col items-center justify-center -mt-6 w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-pink-500 shadow-lg shadow-red-500/50 border-2 border-black"
            >
              <Video className="w-7 h-7 text-white" />
            </button>
          ) : (
            <button
              onClick={() => router.push('/creator/apply')}
              className="flex flex-col items-center justify-center -mt-6 w-14 h-14 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink shadow-lg shadow-digis-cyan/50 border-2 border-black"
            >
              <Sparkles className="w-7 h-7 text-white" />
            </button>
          )}

          {/* Content */}
          <button
            onClick={() => router.push(navItems[2].path)}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
              navItems[2].active ? 'text-digis-cyan' : 'text-gray-400'
            }`}
          >
            <navItems[2].icon className="w-6 h-6" />
            <span className="text-xs font-medium">{navItems[2].label}</span>
          </button>

          {/* Profile/Settings Button */}
          <button
            onClick={() => router.push('/settings')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
              isActive('/settings') ? 'text-digis-cyan' : 'text-gray-400'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-white font-bold text-sm">
              {user?.email?.[0].toUpperCase()}
            </div>
            <span className="text-xs font-medium">{balance}</span>
          </button>
        </div>
      </nav>

      {/* Desktop Side Navigation */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 bg-black/80 backdrop-blur-xl border-r border-white/10 flex-col items-center py-6 z-50">
        {/* Logo */}
        <button
          onClick={() => router.push(userRole === 'admin' ? '/admin' : userRole === 'creator' ? '/creator/dashboard' : '/dashboard')}
          className="mb-8 text-3xl font-bold bg-gradient-to-r from-digis-cyan to-digis-pink bg-clip-text text-transparent hover:scale-110 transition-transform"
        >
          D
        </button>

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
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
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

          {/* Go Live / Creator Action */}
          {userRole === 'creator' ? (
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
          ) : (
            <button
              onClick={() => router.push('/creator/apply')}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-digis-cyan/20 to-digis-pink/20 border border-digis-cyan hover:scale-110 transition-transform"
              title="Become Creator"
            >
              <Sparkles className="w-6 h-6 text-digis-cyan" />
              <span className="text-xs font-medium text-digis-cyan">Creator</span>
            </button>
          )}
        </div>

        {/* User Profile / Settings Button */}
        <button
          onClick={() => router.push('/settings')}
          className={`w-12 h-12 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-lg font-bold transition-all ${
            isActive('/settings')
              ? 'scale-110 ring-2 ring-digis-cyan ring-offset-2 ring-offset-black'
              : 'hover:scale-110'
          }`}
          title="Settings"
        >
          {user.email?.[0].toUpperCase()}
        </button>

        {/* Balance */}
        <div className="mt-4 px-2 py-1 bg-white/5 rounded-lg border border-white/10">
          <div className="text-xs font-bold text-digis-cyan">{balance}</div>
        </div>
      </nav>

      {/* Spacer for desktop side nav */}
      <div className="hidden md:block w-20" />

      {/* Spacer for mobile bottom nav */}
      <div className="md:hidden h-16" />
    </>
  );
}
