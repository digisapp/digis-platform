'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { StreamChat } from '@/components/streaming/StreamChat';
import { Crown, Gift, Video, Star, Coins } from 'lucide-react';
import type { StreamMessage } from '@/db/schema';
import type { StreamWithCreator, FeaturedCreator, CreatorCallSettings } from './types';

interface StreamViewerMobileSectionProps {
  stream: StreamWithCreator;
  streamId: string;
  messages: StreamMessage[];
  currentUserId: string | null;
  viewerCount: number;
  isFollowing: boolean;
  followLoading: boolean;
  leaderboard: any[];
  spotlightedCreator: FeaturedCreator | null;
  creatorCallSettings: CreatorCallSettings | null;
  onSendMessage: (message: string) => Promise<void>;
  onFollowToggle: () => void;
  onShowGiftPanel: () => void;
  onShowCallModal: () => void;
}

export function StreamViewerMobileSection({
  stream, streamId, messages, currentUserId, viewerCount,
  isFollowing, followLoading, leaderboard, spotlightedCreator,
  creatorCallSettings, onSendMessage, onFollowToggle,
  onShowGiftPanel, onShowCallModal,
}: StreamViewerMobileSectionProps) {
  const router = useRouter();

  return (
    <div className="h-[55vh] flex flex-col bg-black/95 border-t border-white/10 overflow-hidden">
      {/* Mobile Action Bar */}
      <div className="border-b border-white/10 bg-black/60 flex-shrink-0">
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button onClick={() => router.push(`/${stream.creator?.username}`)} className="flex-shrink-0">
              {stream.creator?.avatarUrl ? (
                <Image src={stream.creator.avatarUrl} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover ring-2 ring-red-500" unoptimized />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-xs font-bold ring-2 ring-red-500">
                  {stream.creator?.username?.[0] || '?'}
                </div>
              )}
            </button>
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{stream.creator?.username}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400 font-bold">● LIVE</span>
                <span className="text-xs text-gray-400">{viewerCount} watching</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={onShowGiftPanel} className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-digis-pink to-digis-purple rounded-full text-xs font-bold">
              <Gift className="w-3.5 h-3.5" />Gift
            </button>
            {creatorCallSettings && (creatorCallSettings.isAvailableForCalls || creatorCallSettings.isAvailableForVoiceCalls) && (
              <button onClick={onShowCallModal} className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full text-xs font-bold">
                <Video className="w-3.5 h-3.5" />Call
              </button>
            )}
            <button
              onClick={onFollowToggle}
              disabled={followLoading}
              className={`px-3 py-1.5 rounded-full text-xs font-bold ${isFollowing ? 'bg-white/20' : 'bg-digis-cyan'}`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          </div>
        </div>

        {/* Top Gifters */}
        {leaderboard.length > 0 && (
          <div className="px-2 pb-2 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <span className="text-xs text-yellow-400 flex items-center gap-1 flex-shrink-0">
              <Crown className="w-3 h-3" />Top:
            </span>
            {leaderboard.slice(0, 3).map((entry, index) => (
              <div key={entry.senderId} className="flex items-center gap-1 px-2 py-0.5 bg-white/10 rounded-full flex-shrink-0">
                <span className={`text-xs font-bold ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : 'text-amber-600'}`}>
                  {index === 0 ? '👑' : `#${index + 1}`}
                </span>
                <span className="text-xs text-white truncate max-w-[60px]">{entry.senderUsername}</span>
                <span className="text-xs text-digis-cyan">{entry.totalCoins}</span>
              </div>
            ))}
          </div>
        )}

        {/* Mobile Spotlight Card */}
        {spotlightedCreator && (
          <div className="px-2 pb-2">
            <div className="flex items-center gap-2 p-2 rounded-xl border border-yellow-500/50 bg-gradient-to-r from-yellow-500/20 to-orange-500/20">
              <div className="relative flex-shrink-0">
                {spotlightedCreator.avatarUrl ? (
                  <img src={spotlightedCreator.avatarUrl} alt={spotlightedCreator.username} className="w-10 h-10 rounded-full object-cover ring-2 ring-yellow-500" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center ring-2 ring-yellow-500">
                    <span className="text-sm font-bold text-white">{spotlightedCreator.username?.[0]?.toUpperCase() || '?'}</span>
                  </div>
                )}
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Star className="w-2.5 h-2.5 text-black fill-black" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1"><span className="text-[10px] font-bold text-yellow-400 uppercase">✨ Featured</span></div>
                <p className="font-bold text-white text-sm truncate">{spotlightedCreator.username}</p>
              </div>
              <button onClick={onShowGiftPanel} className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full font-bold text-xs text-black">
                <Coins className="w-3.5 h-3.5" />Tip
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Chat */}
      <div className="flex-1 overflow-hidden">
        <StreamChat streamId={streamId} messages={messages} onSendMessage={onSendMessage} currentUserId={currentUserId || undefined} />
      </div>
    </div>
  );
}
