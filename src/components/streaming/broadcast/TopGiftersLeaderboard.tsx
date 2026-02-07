'use client';

import { MessageCircle, UserPlus } from 'lucide-react';

interface TopGiftersLeaderboardProps {
  leaderboard: Array<{ username: string; senderId: string; totalCoins: number }>;
  maxHeight?: string;
  compact?: boolean;
}

/**
 * Top gifters leaderboard used in both desktop sidebar and mobile below-chat areas.
 * Desktop (compact=false): action buttons appear on hover.
 * Mobile (compact=true): action buttons always visible.
 */
export function TopGiftersLeaderboard({ leaderboard, maxHeight = '200px', compact = false }: TopGiftersLeaderboardProps) {
  return (
    <div className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-3">
      <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
        <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        Top Gifters
      </h3>
      <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight }}>
        {leaderboard.length > 0 ? (
          leaderboard.slice(0, 5).map((supporter, index) => (
            <div key={index} className={`flex items-center justify-between p-2 bg-white/5 rounded-lg text-sm ${compact ? '' : 'group hover:bg-white/10 transition-colors'}`}>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="font-bold w-5 flex-shrink-0" style={{ color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#9CA3AF' }}>
                  #{index + 1}
                </span>
                <a
                  href={`/${supporter.username}`}
                  className="font-medium text-white truncate hover:text-cyan-400 transition-colors"
                  title={supporter.username}
                >
                  {supporter.username}
                </a>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-cyan-400 font-bold text-xs">{supporter.totalCoins}</span>
                {compact ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.open(`/chats?userId=${supporter.senderId}`, '_blank')}
                      className="p-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 rounded transition-colors"
                      title="Message (opens in new tab)"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-cyan-400" />
                    </button>
                    <button
                      onClick={() => window.open(`/${supporter.username}`, '_blank')}
                      className="p-1.5 bg-pink-500/20 hover:bg-pink-500/30 rounded transition-colors"
                      title="View Profile (opens in new tab)"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-pink-400" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => window.open(`/chats?userId=${supporter.senderId}`, '_blank')}
                      className="p-1 hover:bg-cyan-500/20 rounded transition-colors"
                      title="Message (opens in new tab)"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-cyan-400" />
                    </button>
                    <button
                      onClick={() => window.open(`/${supporter.username}`, '_blank')}
                      className="p-1 hover:bg-pink-500/20 rounded transition-colors"
                      title="View Profile (opens in new tab)"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-pink-400" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className={`text-center ${compact ? 'py-4' : 'py-3'} text-gray-300`}>
            <svg className={`${compact ? 'w-8 h-8' : 'w-6 h-6'} mx-auto text-yellow-400 ${compact ? 'mb-2' : 'mb-1'}`} fill="currentColor" viewBox="0 0 20 20">
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
            </svg>
            <p className="text-white text-xs font-medium">No gifts yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
