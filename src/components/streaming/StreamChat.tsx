'use client';

import { useState, useEffect, useRef } from 'react';
import type { StreamMessage } from '@/db/schema';
import { GlassButton } from '@/components/ui/GlassButton';
import { ModerationTools } from './ModerationTools';

type StreamChatProps = {
  streamId: string;
  messages: StreamMessage[];
  onSendMessage?: (message: string) => void;
  isCreator?: boolean;
  onMessageDeleted?: () => void;
};

export function StreamChat({ streamId, messages, onSendMessage, isCreator = false, onMessageDeleted }: StreamChatProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getMessageColor = (messageType: string) => {
    switch (messageType) {
      case 'system':
        return 'text-gray-400';
      case 'gift':
        return 'text-digis-pink';
      default:
        return 'text-white';
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[400px] max-h-[calc(100vh-20rem)] lg:max-h-full bg-black/40 backdrop-blur-md rounded-2xl border border-white/10">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-white/10 flex-shrink-0">
        <h3 className="text-lg font-bold text-white">Live Chat</h3>
        <p className="text-sm text-gray-400">{messages.length} messages</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            No messages yet. Be the first to say hi! 👋
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col gap-1 ${
                msg.messageType === 'system' ? 'items-center' : ''
              }`}
            >
              {msg.messageType === 'system' ? (
                <div className="text-sm text-gray-400 italic">{msg.message}</div>
              ) : (
                <>
                  <div className="flex items-start gap-2 group relative">
                    {/* Avatar */}
                    {(msg as any).user?.avatarUrl ? (
                      <img
                        src={(msg as any).user.avatarUrl}
                        alt={msg.username}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {msg.username[0]?.toUpperCase() || '?'}
                      </div>
                    )}

                    {/* Message Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-digis-cyan">
                          {msg.username}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(msg.createdAt)}
                        </span>
                      </div>
                      <div className={`text-sm ${getMessageColor(msg.messageType)}`}>
                        {msg.messageType === 'gift' && msg.giftAmount && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-digis-pink/20 to-digis-cyan/20 rounded-lg border border-digis-pink/30 mr-2">
                            <span className="text-base">🎁</span>
                            <span className="font-bold">{msg.giftAmount} coins</span>
                          </span>
                        )}
                        {msg.message}
                      </div>
                    </div>

                    {/* Moderation Tools (Creator Only) */}
                    {isCreator && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <ModerationTools
                          message={msg}
                          streamId={streamId}
                          onMessageDeleted={onMessageDeleted}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Message Input */}
      {onSendMessage && (
        <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-white/10">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Send a message..."
              className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-digis-cyan transition-colors"
              maxLength={500}
              disabled={isSending}
            />
            <GlassButton
              type="submit"
              variant="cyan"
              size="md"
              disabled={!newMessage.trim() || isSending}
            >
              {isSending ? '...' : 'Send'}
            </GlassButton>
          </div>
          <div className="mt-2 text-xs text-gray-500 text-right">
            {newMessage.length}/500
          </div>
        </form>
      )}
    </div>
  );
}
