'use client';

import type { RefObject } from 'react';
import { Send, ChevronDown } from 'lucide-react';
import type { ChatMessage } from './types';

interface ControlChatProps {
  messages: ChatMessage[];
  chatMessage: string;
  setChatMessage: (msg: string) => void;
  isSending: boolean;
  isAutoScroll: boolean;
  setIsAutoScroll: (v: boolean) => void;
  currentUserId?: string;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  chatInputRef: RefObject<HTMLInputElement | null>;
  onScroll: () => void;
  onSendMessage: (e: React.FormEvent) => void;
  onSelectUser: (user: { id: string; username: string }) => void;
}

export function ControlChat({
  messages, chatMessage, setChatMessage, isSending, isAutoScroll, setIsAutoScroll,
  currentUserId, messagesContainerRef, messagesEndRef, chatInputRef,
  onScroll, onSendMessage, onSelectUser,
}: ControlChatProps) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Messages */}
      <div
        ref={messagesContainerRef as React.RefObject<HTMLDivElement>}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-2"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-lg p-3 ${
              msg.messageType === 'tip' || msg.messageType === 'gift' || msg.messageType === 'super_tip'
                ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30'
                : msg.messageType === 'system'
                ? 'bg-blue-500/10 border border-blue-500/20'
                : 'bg-white/5'
            }`}
            onClick={() => msg.userId !== 'system' && msg.userId !== currentUserId && onSelectUser({ id: msg.userId, username: msg.username })}
          >
            {(msg.messageType === 'tip' || msg.messageType === 'gift' || msg.messageType === 'super_tip') && msg.giftAmount && (
              <div className="flex items-center gap-2 mb-1">
                <span className="text-yellow-400 text-lg">{msg.giftEmoji || '💎'}</span>
                <span className="text-yellow-400 font-bold">{msg.giftAmount} coins</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${
                msg.userId === currentUserId
                  ? 'text-red-400'
                  : msg.messageType === 'tip' || msg.messageType === 'gift'
                  ? 'text-yellow-300'
                  : 'text-digis-cyan'
              }`}>
                @{msg.username}
                {msg.userId === currentUserId && <span className="ml-1 text-xs">(you)</span>}
              </span>
            </div>
            <p className="text-white text-lg mt-1 break-words">
              {msg.messageType === 'super_tip' ? msg.tipMessage : msg.message}
            </p>
          </div>
        ))}
        <div ref={messagesEndRef as React.RefObject<HTMLDivElement>} />
      </div>

      {/* Scroll button */}
      {!isAutoScroll && (
        <button
          onClick={() => {
            setIsAutoScroll(true);
            if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            }
          }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-digis-cyan text-black rounded-full flex items-center gap-2 shadow-lg"
        >
          <ChevronDown className="w-4 h-4" />
          <span className="text-sm font-medium">New messages</span>
        </button>
      )}

      {/* Chat Input */}
      <form onSubmit={onSendMessage} className="p-3 border-t border-white/10">
        <div className="flex gap-2">
          <input
            ref={chatInputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="Send a message as creator..."
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-digis-cyan"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={!chatMessage.trim() || isSending}
            className="px-4 py-3 bg-digis-cyan text-black font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
