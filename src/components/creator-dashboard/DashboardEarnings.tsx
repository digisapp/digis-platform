'use client';

import { useRouter } from 'next/navigation';
import { ChevronDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface DashboardEarningsProps {
  monthlyEarnings: number;
  followerCount: number;
  subscriberCount: number;
  earningsChange: number | null;
  selectedPeriod: string;
  showPeriodDropdown: boolean;
  setShowPeriodDropdown: (v: boolean) => void;
  onPeriodChange: (period: '7' | '30' | '90' | 'all') => void;
  getPeriodLabel: (period: string) => string;
}

export function DashboardEarnings({
  monthlyEarnings, followerCount, subscriberCount,
  earningsChange, selectedPeriod, showPeriodDropdown, setShowPeriodDropdown,
  onPeriodChange, getPeriodLabel,
}: DashboardEarningsProps) {
  const router = useRouter();

  return (
    <div className="mb-6 p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30">
      {/* Period Selector */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">Wallet Balance</p>
        <div className="relative">
          <button
            onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-green-500/30 transition-all text-sm"
          >
            <span className="text-gray-300">{getPeriodLabel(selectedPeriod)}</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showPeriodDropdown ? 'rotate-180' : ''}`} />
          </button>
          {showPeriodDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowPeriodDropdown(false)} />
              <div className="absolute right-0 top-full mt-2 py-1 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl z-50 min-w-[140px]">
                {(['7', '30', '90', 'all'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => onPeriodChange(period)}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                      selectedPeriod === period
                        ? 'text-green-400 bg-green-500/10'
                        : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    {getPeriodLabel(period)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white">{monthlyEarnings.toLocaleString()}</span>
            <span className="text-lg text-gray-400">coins</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-green-400">≈ ${(monthlyEarnings * 0.1).toFixed(2)} USD</p>
            {earningsChange !== null && (
              <div className={`flex items-center gap-1 text-xs font-medium ${
                earningsChange >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {earningsChange >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                <span>{Math.abs(earningsChange).toFixed(0)}%</span>
                <span className="text-gray-500">vs prev</span>
              </div>
            )}
          </div>
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
  );
}
