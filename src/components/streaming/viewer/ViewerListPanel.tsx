'use client';

import React from 'react';
import Image from 'next/image';
import { Users, Coins } from 'lucide-react';

interface Viewer {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface LeaderboardEntry {
  id: string;
  username: string;
  avatarUrl?: string;
  totalSpent: number;
}

interface ViewerListPanelProps {
  viewers: Viewer[];
  leaderboard: LeaderboardEntry[];
}

export function ViewerListPanel({ viewers, leaderboard }: ViewerListPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-cyan-500/5 to-transparent">
      {/* Top Supporters Section */}
      {leaderboard && leaderboard.length > 0 && (
        <div className="p-4 border-b border-cyan-400/20">
          <h3 className="text-sm font-bold text-yellow-400 mb-3 flex items-center gap-2">
            <span className="text-lg">🏆</span> Top Supporters
          </h3>
          <div className="space-y-2">
            {leaderboard.slice(0, 5).map((supporter, index) => (
              <div
                key={supporter.id}
                className={`flex items-center gap-2 p-2 rounded-lg ${
                  index === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30' :
                  index === 1 ? 'bg-gradient-to-r from-gray-400/20 to-gray-300/20 border border-gray-400/30' :
                  index === 2 ? 'bg-gradient-to-r from-orange-600/20 to-orange-500/20 border border-orange-500/30' :
                  'bg-white/5'
                }`}
              >
                <span className={`text-sm font-bold w-5 ${
                  index === 0 ? 'text-yellow-400' :
                  index === 1 ? 'text-gray-300' :
                  index === 2 ? 'text-orange-400' :
                  'text-white/50'
                }`}>
                  {index + 1}
                </span>
                {supporter.avatarUrl ? (
                  <Image src={supporter.avatarUrl} alt={supporter.username} width={28} height={28} className="w-7 h-7 rounded-full object-cover" unoptimized />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-xs font-bold">
                    {supporter.username?.[0]?.toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium text-white truncate flex-1">{supporter.username}</span>
                <div className="flex items-center gap-1 text-xs">
                  <Coins className="w-3 h-3 text-yellow-400" />
                  <span className="text-yellow-400 font-bold">{supporter.totalSpent?.toLocaleString() || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Viewers */}
      <div className="p-4">
        <h3 className="text-sm font-bold text-white/70 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" /> Watching Now
        </h3>
        {viewers.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-4">
            Loading viewers...
          </div>
        ) : (
          <div className="space-y-2">
            {viewers.map((viewer) => (
              <div
                key={viewer.id}
                className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-lg transition-all border border-transparent hover:border-cyan-400/20"
              >
                {viewer.avatarUrl ? (
                  <img
                    src={viewer.avatarUrl}
                    alt={viewer.username}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-xs font-bold">
                    {viewer.displayName?.[0] || viewer.username?.[0] || '?'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate text-white">
                    {viewer.displayName || viewer.username}
                  </div>
                  <div className="text-xs text-white/50 truncate">
                    @{viewer.username}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
