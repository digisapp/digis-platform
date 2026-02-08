'use client';

import { Users, Coins, Trophy } from 'lucide-react';

interface ControlStatsProps {
  currentViewers: number;
  peakViewers: number;
  totalEarnings: number;
  leaderboard: Array<{ username: string; totalCoins: number }>;
}

export function ControlStats({ currentViewers, peakViewers, totalEarnings, leaderboard }: ControlStatsProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <Users className="w-6 h-6 mx-auto mb-2 text-blue-400" />
          <p className="text-2xl font-bold">{currentViewers}</p>
          <p className="text-xs text-gray-400">Current Viewers</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <Users className="w-6 h-6 mx-auto mb-2 text-purple-400" />
          <p className="text-2xl font-bold">{peakViewers}</p>
          <p className="text-xs text-gray-400">Peak Viewers</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <Coins className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
          <p className="text-2xl font-bold">{totalEarnings}</p>
          <p className="text-xs text-gray-400">Total Coins</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <Trophy className="w-6 h-6 mx-auto mb-2 text-green-400" />
          <p className="text-2xl font-bold">{leaderboard.length}</p>
          <p className="text-xs text-gray-400">Supporters</p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white/5 rounded-xl p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Top Supporters
        </h3>
        {leaderboard.length === 0 ? (
          <p className="text-gray-500 text-sm">No supporters yet</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.slice(0, 10).map((supporter, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-yellow-500 text-black' :
                    i === 1 ? 'bg-gray-400 text-black' :
                    i === 2 ? 'bg-orange-600 text-white' :
                    'bg-white/10 text-gray-400'
                  }`}>
                    {i + 1}
                  </span>
                  <span className="font-medium">@{supporter.username}</span>
                </div>
                <span className="text-yellow-400 font-semibold">{supporter.totalCoins}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
