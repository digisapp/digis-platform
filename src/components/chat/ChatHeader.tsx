'use client';

import { useRouter } from 'next/navigation';
import { MoreVertical } from 'lucide-react';
import type { Conversation } from './types';

interface ChatHeaderProps {
  conversation: Conversation;
  showOptionsMenu: boolean;
  setShowOptionsMenu: (v: boolean) => void;
  isBlocking: boolean;
  onBlockUser: () => void;
}

export function ChatHeader({
  conversation, showOptionsMenu, setShowOptionsMenu, isBlocking, onBlockUser,
}: ChatHeaderProps) {
  const router = useRouter();

  return (
    <div className="backdrop-blur-xl bg-black/60 border-b border-white/10 sticky top-0 z-10 rounded-t-3xl">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/chats')} className="text-gray-400 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={() => router.push(`/${conversation.otherUser.username}`)}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-lg font-bold">
                {conversation.otherUser.avatarUrl ? (
                  <img
                    src={conversation.otherUser.avatarUrl}
                    alt={conversation.otherUser.username || 'User'}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white">
                    {conversation.otherUser.username?.[0]?.toUpperCase() || '?'}
                  </span>
                )}
              </div>

              <div className="text-left">
                <h2 className="font-semibold text-white">{conversation.otherUser.username}</h2>
                <p className="text-sm text-gray-400">
                  {conversation.otherUser.role === 'creator' ? 'Creator' : 'Fan'}
                </p>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                className="p-2.5 rounded-xl bg-white/10 border border-white/20 hover:border-white/40 transition-all hover:scale-105 text-white"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {showOptionsMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowOptionsMenu(false)} />
                  <div className="absolute right-0 top-12 bg-black/95 backdrop-blur-xl rounded-lg border border-white/20 p-2 min-w-[160px] z-50 shadow-xl">
                    <button
                      onClick={() => { router.push(`/${conversation.otherUser.username}`); setShowOptionsMenu(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded flex items-center gap-2"
                    >
                      👤 View Profile
                    </button>
                    <div className="border-t border-white/10 my-1" />
                    <button
                      onClick={onBlockUser}
                      disabled={isBlocking}
                      className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-white/10 rounded flex items-center gap-2 disabled:opacity-50"
                    >
                      ⛔ Block User
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
