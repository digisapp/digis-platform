'use client';

import { Trophy, Medal, Award, Coins } from 'lucide-react';

interface Supporter {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  totalCoins: number;
  rank: number;
}

interface TopSupportersWidgetProps {
  supporters: Supporter[];
}

export function TopSupportersWidget({ supporters }: TopSupportersWidgetProps) {
  if (!supporters || supporters.length === 0) return null;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" fill="currentColor" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" fill="currentColor" />;
      case 3:
        return <Award className="w-5 h-5 text-orange-600" fill="currentColor" />;
      default:
        return null;
    }
  };

  const getRankGradient = (rank: number) => {
    switch (rank) {
      case 1:
        return 'from-yellow-400 to-orange-500';
      case 2:
        return 'from-gray-300 to-gray-500';
      case 3:
        return 'from-orange-400 to-red-500';
      default:
        return 'from-purple-400 to-pink-400';
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/60 backdrop-blur-sm border-2 border-purple-200 p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500">
          <Trophy className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Top Supporters</h3>
        <div className="ml-auto px-2.5 py-1 rounded-full bg-gradient-to-r from-yellow-400/20 to-orange-500/20 text-xs font-bold text-gray-700">
          This Month
        </div>
      </div>

      {/* Supporters List */}
      <div className="space-y-3">
        {supporters.slice(0, 3).map((supporter) => (
          <div
            key={supporter.userId}
            className="group relative flex items-center gap-3 p-3 rounded-xl bg-white/40 hover:bg-white/60 transition-all hover:scale-[1.02] border-2 border-transparent hover:border-digis-cyan"
          >
            {/* Rank */}
            <div className="flex-shrink-0 w-8 flex items-center justify-center">
              {getRankIcon(supporter.rank) || (
                <span className="text-sm font-bold text-gray-600">#{supporter.rank}</span>
              )}
            </div>

            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {supporter.avatarUrl ? (
                <img
                  src={supporter.avatarUrl}
                  alt={supporter.displayName || supporter.username}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-lg"
                />
              ) : (
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getRankGradient(supporter.rank)} flex items-center justify-center text-white font-bold ring-2 ring-white shadow-lg`}>
                  {(supporter.displayName || supporter.username).charAt(0).toUpperCase()}
                </div>
              )}

              {/* Hall of Fame Badge for #1 */}
              {supporter.rank === 1 && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center border-2 border-white shadow-lg">
                  <Trophy className="w-3 h-3 text-white" fill="white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-900 text-sm truncate">
                {supporter.displayName || supporter.username}
              </div>
              <div className="text-xs text-gray-600">@{supporter.username}</div>
            </div>

            {/* Amount */}
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-400/20 to-orange-500/20">
              <Coins className="w-4 h-4 text-yellow-600" />
              <span className="font-bold text-sm text-gray-900">
                {supporter.totalCoins.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* View All Link */}
      {supporters.length > 3 && (
        <button className="mt-4 w-full py-2 text-sm font-semibold text-digis-cyan hover:text-digis-purple transition-colors">
          View All Supporters ({supporters.length})
        </button>
      )}
    </div>
  );
}
