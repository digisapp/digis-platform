'use client';

import { useState, useEffect, useRef } from 'react';
import type { StreamMessage } from '@/db/schema';
import { Send, Smile, Gift, Pin, X } from 'lucide-react';
import { ModerationTools } from './ModerationTools';

type StreamChatProps = {
  streamId: string;
  messages: StreamMessage[];
  onSendMessage?: (message: string) => void;
  isCreator?: boolean;
  onMessageDeleted?: () => void;
  pinnedMessage?: StreamMessage | null;
  onPinMessage?: (message: StreamMessage | null) => void;
};

// Quick emojis for chat
const CHAT_EMOJIS = ['❤️', '🔥', '😂', '👏', '🎉', '💯', '😍', '🙌'];

export function StreamChat({ streamId, messages, onSendMessage, isCreator = false, onMessageDeleted, pinnedMessage, onPinMessage }: StreamChatProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = chatContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      // Only auto-scroll if user is near the bottom
      if (isNearBottom) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !onSendMessage || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(newMessage.trim());
      setNewMessage('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const insertEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojis(false);
    inputRef.current?.focus();
  };

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      {/* Pinned Message */}
      {pinnedMessage && (
        <div className="px-3 py-2 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-b border-yellow-500/30">
          <div className="flex items-start gap-2">
            <Pin className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-yellow-400">PINNED</span>
                <span className="text-xs text-gray-400">by {pinnedMessage.username}</span>
              </div>
              <p className="text-sm text-white/90 truncate">{pinnedMessage.message}</p>
            </div>
            {isCreator && onPinMessage && (
              <button
                onClick={() => onPinMessage(null)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                title="Unpin message"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scrollbar-thin"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <span className="text-4xl">💬</span>
            </div>
            <h3 className="text-2xl font-bold mb-2 text-white">No messages yet</h3>
            <p className="text-gray-400 text-lg">Be the first to say hi!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`group relative ${msg.messageType === 'system' ? 'text-center' : ''}`}
            >
              {msg.messageType === 'system' ? (
                <div className="py-2 px-4 bg-white/5 rounded-lg inline-block">
                  <span className="text-sm text-gray-400 italic">{msg.message}</span>
                </div>
              ) : (msg as any).messageType === 'shoutout' ? (
                // Shoutout message - special highlighted styling
                <div className="py-3 px-4 bg-gradient-to-r from-cyan-500/20 to-digis-pink/20 rounded-xl border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl animate-bounce">📣</span>
                    <div>
                      <span className="text-sm text-white font-semibold">{msg.message}</span>
                      {(msg as any).shoutoutData?.targetUsername && (
                        <div className="text-xs text-cyan-400 mt-1">
                          Check out @{(msg as any).shoutoutData.targetUsername}!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : msg.messageType === 'gift' ? (
                // Gift message - special styling
                <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-digis-pink/10 to-digis-cyan/10 rounded-xl border border-digis-pink/20">
                  {/* Avatar */}
                  {(msg as any).user?.avatarUrl ? (
                    <img
                      src={(msg as any).user.avatarUrl}
                      alt={msg.username}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-digis-pink to-digis-cyan flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {msg.username?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-digis-pink">{msg.username}</span>
                      <span className="text-xs text-gray-500">{formatTimestamp(msg.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-2xl">🎁</span>
                      <span className="text-sm text-white">
                        Sent <span className="font-bold text-digis-cyan">{msg.giftAmount} coins</span>
                      </span>
                    </div>
                    {msg.message && (
                      <p className="text-sm text-gray-300 mt-1">{msg.message}</p>
                    )}
                  </div>
                </div>
              ) : (msg as any).messageType === 'tip' ? (
                // Tip message - special green styling
                <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
                  {/* Avatar */}
                  {(msg as any).user?.avatarUrl || (msg as any).avatarUrl ? (
                    <img
                      src={(msg as any).user?.avatarUrl || (msg as any).avatarUrl}
                      alt={msg.username}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {msg.username?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-green-400">{msg.username}</span>
                      <span className="text-xs text-gray-500">{formatTimestamp(msg.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-2xl">💰</span>
                      <span className="text-sm text-white">
                        Tipped <span className="font-bold text-green-400">{(msg as any).tipAmount || (msg as any).giftAmount || '?'} coins</span>
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                // Regular message
                <div className="flex items-start gap-3 py-1 hover:bg-white/5 rounded-lg px-2 -mx-2 transition-colors">
                  {/* Avatar */}
                  {(msg as any).user?.avatarUrl ? (
                    <img
                      src={(msg as any).user.avatarUrl}
                      alt={msg.username}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {msg.username?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}

                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-semibold text-digis-cyan text-sm">
                        {msg.username}
                      </span>
                      <span className="text-xs text-gray-600">
                        {formatTimestamp(msg.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-white/90 break-words leading-relaxed">
                      {msg.message}
                    </p>
                  </div>

                  {/* Moderation Tools (Creator Only) */}
                  {isCreator && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <ModerationTools
                        message={msg}
                        streamId={streamId}
                        onMessageDeleted={onMessageDeleted}
                        onPinMessage={onPinMessage}
                        isPinned={pinnedMessage?.id === msg.id}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Message Input - Fixed at bottom, compact on mobile */}
      {onSendMessage && (
        <div className="p-2 border-t border-white/10 bg-black/80 flex-shrink-0">
          {/* Quick Emoji Bar */}
          {showEmojis && (
            <div className="mb-2 flex items-center gap-1 flex-wrap p-2 bg-white/5 rounded-xl">
              {CHAT_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="w-8 h-8 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            {/* Emoji Toggle */}
            <button
              type="button"
              onClick={() => setShowEmojis(!showEmojis)}
              className={`p-2 rounded-lg transition-colors flex-shrink-0 ${showEmojis ? 'bg-digis-cyan text-black' : 'hover:bg-white/10 text-gray-400'}`}
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Say something..."
              className="flex-1 min-w-0 px-3 py-2 bg-white/10 border border-white/20 rounded-full text-white placeholder-gray-500 focus:outline-none focus:border-digis-cyan transition-all text-[16px]"
              maxLength={500}
              disabled={isSending}
              enterKeyHint="send"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!newMessage.trim() || isSending}
              className="p-2 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-full text-white hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
