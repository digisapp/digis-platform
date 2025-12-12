'use client';

import { useEffect, useState, useRef } from 'react';
import { Coins, Send } from 'lucide-react';

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  content: string;
  timestamp: number;
  isCreator?: boolean;
  isModerator?: boolean;
  messageType?: 'chat' | 'tip' | 'gift';
  tipAmount?: number;
  giftEmoji?: string;
  giftName?: string;
  giftQuantity?: number;
}

interface OverlayChatProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  currentUserId?: string;
  isAuthenticated: boolean;
  disabled?: boolean;
  streamId: string;
}

export default function OverlayChat({
  messages,
  onSendMessage,
  currentUserId,
  isAuthenticated,
  disabled,
  streamId,
}: OverlayChatProps) {
  const [visibleMessages, setVisibleMessages] = useState<(ChatMessage & { fadeOut: boolean })[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [showInput, setShowInput] = useState(false);
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Add new messages and set up auto-fade
  useEffect(() => {
    const lastMessages = messages.slice(-15); // Keep last 15 messages

    lastMessages.forEach((msg) => {
      // Check if message is already visible
      if (visibleMessages.some((vm) => vm.id === msg.id)) return;

      // Add message to visible list
      setVisibleMessages((prev) => {
        const newMessages = [...prev, { ...msg, fadeOut: false }];
        // Keep only last 8 visible at a time
        return newMessages.slice(-8);
      });

      // Set up fade out after 6 seconds (unless it's a tip/gift)
      const fadeDelay = msg.messageType === 'tip' || msg.messageType === 'gift' ? 10000 : 6000;

      const fadeTimeout = setTimeout(() => {
        setVisibleMessages((prev) =>
          prev.map((vm) => (vm.id === msg.id ? { ...vm, fadeOut: true } : vm))
        );

        // Remove after fade animation (500ms)
        const removeTimeout = setTimeout(() => {
          setVisibleMessages((prev) => prev.filter((vm) => vm.id !== msg.id));
          timeoutsRef.current.delete(msg.id);
        }, 500);

        timeoutsRef.current.set(`${msg.id}-remove`, removeTimeout);
      }, fadeDelay);

      timeoutsRef.current.set(msg.id, fadeTimeout);
    });

    // Cleanup old timeouts
    return () => {
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    };
  }, [messages]);

  const handleSend = () => {
    if (!messageInput.trim() || disabled) return;
    onSendMessage(messageInput.trim());
    setMessageInput('');
    setShowInput(false);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 pointer-events-none">
      {/* Messages container */}
      <div className="px-3 pb-2 space-y-1.5 max-h-[40vh] overflow-hidden">
        {visibleMessages.map((msg) => (
          <div
            key={msg.id}
            className={`pointer-events-auto transition-all duration-500 ${
              msg.fadeOut ? 'opacity-0 translate-x-[-20px]' : 'opacity-100'
            }`}
          >
            {msg.messageType === 'tip' ? (
              // Tip message - highlighted
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-green-500/80 to-emerald-500/80 backdrop-blur-sm shadow-lg shadow-green-500/30 max-w-[85%]">
                {msg.avatarUrl ? (
                  <img src={msg.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-green-300 flex items-center justify-center text-[10px] font-bold text-green-800">
                    {msg.username[0].toUpperCase()}
                  </div>
                )}
                <span className="font-bold text-white text-xs">{msg.username}</span>
                <Coins className="w-3.5 h-3.5 text-yellow-300" />
                <span className="font-bold text-yellow-300 text-xs">{msg.tipAmount}</span>
              </div>
            ) : msg.messageType === 'gift' ? (
              // Gift message - highlighted with emoji
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500/80 to-purple-500/80 backdrop-blur-sm shadow-lg shadow-pink-500/30 max-w-[85%]">
                {msg.avatarUrl ? (
                  <img src={msg.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-pink-300 flex items-center justify-center text-[10px] font-bold text-pink-800">
                    {msg.username[0].toUpperCase()}
                  </div>
                )}
                <span className="font-bold text-white text-xs">{msg.username}</span>
                <span className="text-white/80 text-xs">sent</span>
                {msg.giftQuantity && msg.giftQuantity > 1 && (
                  <span className="font-bold text-white text-xs">{msg.giftQuantity}x</span>
                )}
                <span className="text-base">{msg.giftEmoji}</span>
              </div>
            ) : (
              // Regular chat message
              <div className="inline-flex items-start gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/50 backdrop-blur-sm max-w-[85%]">
                {msg.avatarUrl ? (
                  <img src={msg.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0 mt-0.5" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-pink-400 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5">
                    {msg.username[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <span
                    className={`font-bold text-xs ${
                      msg.isCreator ? 'text-yellow-400' : 'text-cyan-300'
                    }`}
                  >
                    {msg.username}
                  </span>
                  {msg.isCreator && (
                    <span className="ml-1 text-[10px] px-1 py-0.5 bg-yellow-500/30 text-yellow-300 rounded">
                      Creator
                    </span>
                  )}
                  <p className="text-white text-xs break-words leading-relaxed">{msg.content}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Chat input area */}
      <div className="px-3 pb-3 pointer-events-auto">
        {showInput ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              onBlur={() => !messageInput && setShowInput(false)}
              autoFocus
              placeholder="Send a message..."
              disabled={disabled}
              className="flex-1 px-3 py-2.5 bg-black/60 backdrop-blur-sm border border-white/20 rounded-full text-white text-sm placeholder-white/50 focus:outline-none focus:border-cyan-400"
            />
            <button
              onClick={handleSend}
              disabled={!messageInput.trim() || disabled}
              className="p-2.5 bg-gradient-to-r from-cyan-500 to-pink-500 rounded-full disabled:opacity-50 hover:scale-105 transition-transform"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : isAuthenticated ? (
          <button
            onClick={() => setShowInput(true)}
            className="w-full px-4 py-2.5 bg-black/40 backdrop-blur-sm border border-white/20 rounded-full text-white/60 text-sm text-left hover:bg-black/60 hover:border-white/30 transition-all"
          >
            Send a message...
          </button>
        ) : (
          <div className="px-4 py-2.5 bg-black/40 backdrop-blur-sm border border-white/20 rounded-full text-white/50 text-sm text-center">
            Sign in to chat
          </div>
        )}
      </div>
    </div>
  );
}
