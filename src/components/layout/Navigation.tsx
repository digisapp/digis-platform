'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('fan');
  const [balance, setBalance] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    checkUser();
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
  }, []);

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
      icon: '🏠',
      path: userRole === 'creator' ? '/creator/dashboard' : '/dashboard',
      active: isActive('/dashboard') || isActive('/creator/dashboard'),
    },
    {
      label: 'Explore',
      icon: '🔍',
      path: '/explore',
      active: isActive('/explore') || pathname?.startsWith('/profile'),
    },
    // Center button will be here
    {
      label: 'Messages',
      icon: '💬',
      path: '/messages',
      active: isActive('/messages') || pathname?.startsWith('/messages'),
    },
    {
      label: 'Wallet',
      icon: '💰',
      path: '/wallet',
      active: isActive('/wallet'),
    },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation (TikTok/Instagram style) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-black/95 backdrop-blur-xl border-t border-white/10 pb-safe">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.slice(0, 2).map((item) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                item.active ? 'text-digis-cyan' : 'text-gray-400'
              }`}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}

          {/* Center Action Button */}
          {userRole === 'creator' ? (
            <button
              onClick={() => router.push('/creator/go-live')}
              className="flex flex-col items-center justify-center -mt-6 w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-pink-500 shadow-lg shadow-red-500/50 border-2 border-black"
            >
              <span className="text-2xl">📹</span>
            </button>
          ) : (
            <button
              onClick={() => router.push('/creator/apply')}
              className="flex flex-col items-center justify-center -mt-6 w-14 h-14 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink shadow-lg shadow-digis-cyan/50 border-2 border-black"
            >
              <span className="text-2xl">⭐</span>
            </button>
          )}

          {navItems.slice(2).map((item) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                item.active ? 'text-digis-cyan' : 'text-gray-400'
              }`}
            >
              <div className="relative">
                <span className="text-2xl">{item.icon}</span>
                {item.label === 'Messages' && unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
              </div>
              <span className="text-xs font-medium">
                {item.label === 'Wallet' ? balance : item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Desktop Side Navigation */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 bg-black/80 backdrop-blur-xl border-r border-white/10 flex-col items-center py-6 z-50">
        {/* Logo */}
        <button
          onClick={() => router.push(userRole === 'creator' ? '/creator/dashboard' : '/dashboard')}
          className="mb-8 text-3xl font-bold bg-gradient-to-r from-digis-cyan to-digis-pink bg-clip-text text-transparent hover:scale-110 transition-transform"
        >
          D
        </button>

        {/* Navigation Items */}
        <div className="flex-1 flex flex-col gap-4">
          {navItems.map((item) => (
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
                <span className="text-2xl">{item.icon}</span>
                {item.label === 'Messages' && unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}

          {/* Go Live / Creator Action */}
          {userRole === 'creator' ? (
            <button
              onClick={() => router.push('/creator/go-live')}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-red-500/20 to-pink-500/20 border border-red-500 hover:scale-110 transition-transform"
              title="Go Live"
            >
              <div className="relative">
                <span className="text-2xl">📹</span>
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
              <span className="text-2xl">⭐</span>
              <span className="text-xs font-medium text-digis-cyan">Creator</span>
            </button>
          )}
        </div>

        {/* User Profile */}
        <button
          onClick={handleLogout}
          className="mt-auto w-12 h-12 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-lg font-bold hover:scale-110 transition-transform"
          title="Logout"
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
