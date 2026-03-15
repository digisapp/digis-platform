'use client';

import { Copy, Check, Sparkles, User } from 'lucide-react';
import { useState } from 'react';
import type { CoachMessage } from '@/lib/coach/types';

interface SuccessCoachMessageProps {
  message: CoachMessage;
}

export function SuccessCoachMessage({ message }: SuccessCoachMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isScript = message.metadata?.actionType === 'script';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser
          ? 'bg-gradient-to-br from-cyan-500 to-blue-500 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
          : 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_10px_rgba(147,51,234,0.3)]'
      }`}>
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Sparkles className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message bubble */}
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`relative px-4 py-3 rounded-2xl ${
          isUser
            ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/15 rounded-tr-md'
            : isScript
              ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/15 rounded-tl-md'
              : 'bg-white/[0.06] border border-white/10 rounded-tl-md'
        }`}>
          {/* Script badge */}
          {isScript && !isUser && (
            <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-yellow-500/15">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-xs font-medium text-yellow-400">Generated Script</span>
              {message.metadata?.scriptType && (
                <span className="text-xs text-yellow-400/60">
                  ({message.metadata.scriptType === '10sec' ? '10s' : message.metadata.scriptType === '30sec' ? '30s' : 'Full'})
                </span>
              )}
            </div>
          )}

          {/* Message content */}
          <p className={`text-[13px] leading-relaxed whitespace-pre-wrap ${
            isUser ? 'text-white' : 'text-gray-200'
          }`}>
            {message.content}
          </p>

          {/* Copy button */}
          {!isUser && (
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/15 transition-colors group"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-gray-500 group-hover:text-gray-300" />
              )}
            </button>
          )}
        </div>

        {/* Timestamp */}
        <p className={`text-[10px] text-gray-600 mt-1 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}
