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

  // Format timestamp
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser
          ? 'bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border border-cyan-500/30'
          : 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/30'
      }`}>
        {isUser ? (
          <User className="w-4 h-4 text-cyan-400" />
        ) : (
          <Sparkles className="w-4 h-4 text-purple-400" />
        )}
      </div>

      {/* Message bubble */}
      <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`relative px-4 py-3 rounded-2xl ${
          isUser
            ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/20 rounded-tr-sm'
            : isScript
              ? 'bg-gradient-to-r from-yellow-500/15 to-orange-500/15 border border-yellow-500/20 rounded-tl-sm'
              : 'bg-gradient-to-r from-purple-500/15 to-pink-500/15 border border-purple-500/20 rounded-tl-sm'
        }`}>
          {/* Script badge */}
          {isScript && !isUser && (
            <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-yellow-500/20">
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
          <p className={`text-sm whitespace-pre-wrap ${
            isUser ? 'text-white' : 'text-gray-200'
          }`}>
            {message.content}
          </p>

          {/* Copy button for assistant messages */}
          {!isUser && (
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
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
        <p className={`text-[10px] text-gray-500 mt-1 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}
