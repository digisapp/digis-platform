'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { GlassButton } from '@/components/ui/GlassButton';

export function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('fan');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    checkUser();
    fetchBalance();
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

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => router.push(userRole === 'creator' ? '/creator/dashboard' : '/dashboard')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="text-2xl font-bold bg-gradient-to-r from-digis-cyan to-digis-pink bg-clip-text text-transparent">
              Digis
            </div>
          </button>

          {/* Main Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <button
              onClick={() => router.push('/live')}
              className={`text-sm font-medium transition-colors ${
                isActive('/live')
                  ? 'text-digis-cyan'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🎥 Live
            </button>

            {userRole === 'creator' && (
              <button
                onClick={() => router.push('/creator/go-live')}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 rounded-lg border border-red-500 hover:bg-red-500/30 transition-colors"
              >
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-500 font-bold text-sm">GO LIVE</span>
              </button>
            )}

            <button
              onClick={() => router.push('/calls/history')}
              className={`text-sm font-medium transition-colors ${
                isActive('/calls/history')
                  ? 'text-digis-cyan'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              📞 Calls
            </button>

            <button
              onClick={() => router.push('/wallet')}
              className={`text-sm font-medium transition-colors ${
                isActive('/wallet')
                  ? 'text-digis-cyan'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              💰 Wallet
            </button>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* Balance */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
              <span className="text-xs text-gray-400">Balance:</span>
              <span className="text-sm font-bold text-digis-cyan">{balance}</span>
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-sm font-bold">
                  {user.email?.[0].toUpperCase()}
                </div>
                <span className="text-sm text-white hidden md:block">
                  {userRole === 'creator' ? '⭐ Creator' : '👤 Fan'}
                </span>
              </button>

              {/* Dropdown */}
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-black/90 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl z-50">
                    <div className="p-3 border-b border-white/10">
                      <div className="text-xs text-gray-400">Signed in as</div>
                      <div className="text-sm text-white truncate">{user.email}</div>
                    </div>

                    <div className="p-2">
                      <button
                        onClick={() => {
                          router.push(userRole === 'creator' ? '/creator/dashboard' : '/dashboard');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors"
                      >
                        🏠 Dashboard
                      </button>

                      {userRole !== 'creator' && (
                        <button
                          onClick={() => {
                            router.push('/creator/apply');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                          ⭐ Become a Creator
                        </button>
                      )}

                      <button
                        onClick={() => {
                          router.push('/wallet');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors"
                      >
                        💰 Wallet
                      </button>

                      <div className="my-2 border-t border-white/10" />

                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        🚪 Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center gap-4 pb-3 overflow-x-auto">
          <button
            onClick={() => router.push('/live')}
            className={`text-xs font-medium whitespace-nowrap px-3 py-1.5 rounded-lg ${
              isActive('/live')
                ? 'bg-digis-cyan/20 text-digis-cyan border border-digis-cyan'
                : 'text-gray-400 border border-white/10'
            }`}
          >
            🎥 Live
          </button>

          {userRole === 'creator' && (
            <button
              onClick={() => router.push('/creator/go-live')}
              className="flex items-center gap-1 text-xs font-bold whitespace-nowrap px-3 py-1.5 rounded-lg bg-red-500/20 text-red-500 border border-red-500"
            >
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              GO LIVE
            </button>
          )}

          <button
            onClick={() => router.push('/calls/history')}
            className={`text-xs font-medium whitespace-nowrap px-3 py-1.5 rounded-lg ${
              isActive('/calls/history')
                ? 'bg-digis-cyan/20 text-digis-cyan border border-digis-cyan'
                : 'text-gray-400 border border-white/10'
            }`}
          >
            📞 Calls
          </button>

          <button
            onClick={() => router.push('/wallet')}
            className={`text-xs font-medium whitespace-nowrap px-3 py-1.5 rounded-lg ${
              isActive('/wallet')
                ? 'bg-digis-cyan/20 text-digis-cyan border border-digis-cyan'
                : 'text-gray-400 border border-white/10'
            }`}
          >
            💰 {balance}
          </button>
        </div>
      </div>
    </nav>
  );
}
