'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { streamAnalytics } from '@/lib/utils/analytics';
import { getTierColor, type SpendTier } from '@/lib/tiers/spend-tiers';

interface Message {
  id: string;
  username: string;
  content: string;
  timestamp: number;
  type?: 'message' | 'tip';
  amount?: number;
  spendTier?: SpendTier;
}

interface QuickChatProps {
  streamId: string;
  compact?: boolean;
  maxMessages?: number;
}

export default function QuickChat({ streamId, compact = false, maxMessages = 10 }: QuickChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // Connect to real-time chat with Supabase
  useEffect(() => {
    const supabase = createClient();

    // Load recent messages
    const loadRecentMessages = async () => {
      try {
        const response = await fetch(`/api/streams/${streamId}/messages?limit=${maxMessages}`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages || []);
        }
      } catch (error) {
        console.error('[QuickChat] Error loading messages:', error);
      }
    };

    loadRecentMessages();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`stream:${streamId}:chat`)
      .on('broadcast', { event: 'message' }, (payload) => {
        const newMessage = payload.payload as Message;
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === newMessage.id)) {
            return prev;
          }
          // Keep only the last maxMessages
          const updated = [...prev, newMessage];
          return updated.slice(-maxMessages);
        });
      })
      .on('broadcast', { event: 'tip' }, (payload) => {
        const tipMessage = payload.payload as Message;
        setMessages((prev) => {
          const updated = [...prev, tipMessage];
          return updated.slice(-maxMessages);
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId, maxMessages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      username: 'You',
      content: inputValue,
      timestamp: Date.now(),
      type: 'message',
    };

    // Optimistic UI: show message immediately
    setMessages(prev => [...prev, optimisticMessage]);
    setInputValue('');

    // Track analytics
    streamAnalytics.chatMessageSent(streamId);

    try {
      const response = await fetch(`/api/streams/${streamId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: inputValue }),
      });

      if (!response.ok) {
        // Rollback optimistic message on failure
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      }
    } catch (error) {
      // Rollback on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      console.error('[QuickChat] Send error:', error);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Messages */}
      <div
        ref={chatRef}
        className={`overflow-y-auto ${compact ? 'max-h-32' : 'max-h-64'} space-y-1 text-xs`}
        style={{ scrollbarWidth: 'thin' }}
      >
        {messages.length === 0 ? (
          <div className="text-gray-400 text-center py-4">No messages yet</div>
        ) : (
          messages.map((msg) => {
            const tierColor = msg.spendTier ? getTierColor(msg.spendTier) : 'text-white/80';

            return (
              <div key={msg.id} className="flex gap-2">
                {msg.type === 'tip' ? (
                  <div className="flex-1 bg-digis-pink/20 rounded px-2 py-1">
                    <span className={`font-semibold ${tierColor}`}>{msg.username}</span>
                    <span className="text-digis-pink"> tipped {msg.amount} coins</span>
                  </div>
                ) : (
                  <>
                    <span className={`font-semibold ${tierColor}`}>{msg.username}:</span>
                    <span className="text-white/70 flex-1">{msg.content}</span>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Send a message..."
          className="flex-1 px-4 py-3 rounded-xl bg-white/10 text-white text-sm placeholder:text-white/40 border border-white/20 focus:outline-none focus:border-digis-cyan transition-colors"
        />
        <button
          onClick={handleSendMessage}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-digis-cyan to-digis-pink text-white text-sm font-semibold hover:scale-105 transition-all shadow-md shadow-digis-pink/30"
        >
          Send
        </button>
      </div>
    </div>
  );
}
