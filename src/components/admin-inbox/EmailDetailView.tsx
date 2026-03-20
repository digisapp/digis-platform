'use client';

import { ArrowLeft, Reply, Star, Trash2, AlertOctagon, User, ExternalLink } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui';
import type { EmailDetail } from './types';

function formatFullDate(dateStr: string) {
  return new Date(dateStr).toLocaleString([], {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface EmailDetailViewProps {
  email: EmailDetail;
  thread: EmailDetail[];
  loading: boolean;
  onBack: () => void;
  onReply: () => void;
  onToggleStar: (id: string) => void;
  onMarkSpam: (id: string) => void;
  onDelete: (id: string) => void;
}

export function EmailDetailView({
  email,
  thread,
  loading,
  onBack,
  onReply,
  onToggleStar,
  onMarkSpam,
  onDelete,
}: EmailDetailViewProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const displayThread = thread.length > 1 ? thread : [email];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors md:hidden"
          aria-label="Back to list"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>

        <h2 className="text-lg font-bold text-white truncate flex-1">{email.subject}</h2>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleStar(email.id)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Star"
          >
            <Star className={`w-4 h-4 ${email.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-500'}`} />
          </button>
          <button
            onClick={onReply}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Reply"
          >
            <Reply className="w-4 h-4 text-gray-500" />
          </button>
          {email.direction === 'inbound' && (
            <button
              onClick={() => onMarkSpam(email.id)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Mark as spam"
            >
              <AlertOctagon className="w-4 h-4 text-gray-500" />
            </button>
          )}
          <button
            onClick={() => onDelete(email.id)}
            className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
            aria-label="Delete"
          >
            <Trash2 className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 overflow-y-auto">
        {displayThread.map((msg, idx) => (
          <div
            key={msg.id}
            className={`px-4 py-4 ${idx < displayThread.length - 1 ? 'border-b border-white/5' : ''}`}
          >
            {/* Sender info */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.direction === 'inbound' ? 'bg-cyan-500/20' : 'bg-purple-500/20'
                }`}>
                  <User className={`w-4 h-4 ${msg.direction === 'inbound' ? 'text-cyan-400' : 'text-purple-400'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      {msg.fromName || msg.fromAddress}
                    </span>
                    {msg.direction === 'outbound' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium">SENT</span>
                    )}
                    {msg.linkedUserId && (
                      <a
                        href={`/admin/community?search=${encodeURIComponent(msg.fromAddress)}`}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-medium hover:bg-cyan-500/30 transition-colors flex items-center gap-0.5"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        Digis User
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {msg.direction === 'inbound' ? `To: ${msg.toAddress}` : `To: ${msg.toAddress}`}
                  </p>
                </div>
              </div>
              <span className="text-xs text-gray-500 flex-shrink-0">{formatFullDate(msg.createdAt)}</span>
            </div>

            {/* Body */}
            {msg.bodyHtml ? (
              <div className="bg-white/[0.02] rounded-xl border border-white/5 overflow-hidden">
                <iframe
                  srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,sans-serif;font-size:14px;color:#e5e7eb;background:transparent;margin:16px;line-height:1.6;word-wrap:break-word}a{color:#22d3ee}img{max-width:100%;height:auto}blockquote{border-left:3px solid #374151;margin:8px 0;padding-left:12px;color:#9ca3af}</style></head><body>${msg.bodyHtml}</body></html>`}
                  className="w-full border-0 min-h-[200px]"
                  sandbox="allow-same-origin"
                  title="Email content"
                  onLoad={(e) => {
                    const iframe = e.currentTarget;
                    if (iframe.contentDocument) {
                      iframe.style.height = Math.max(200, iframe.contentDocument.body.scrollHeight + 40) + 'px';
                    }
                  }}
                />
              </div>
            ) : (
              <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed bg-white/[0.02] rounded-xl border border-white/5 p-4">
                {msg.bodyText || '(No content)'}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Reply bar */}
      <div className="px-4 py-3 border-t border-white/10">
        <button
          onClick={onReply}
          className="w-full px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 text-sm text-left transition-colors"
        >
          Click to reply...
        </button>
      </div>
    </div>
  );
}
