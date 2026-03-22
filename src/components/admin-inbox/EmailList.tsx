'use client';

import { Star, Circle, CheckSquare, Square } from 'lucide-react';
import type { EmailListItem } from './types';
import { AI_CATEGORY_LABELS, STATUS_LABELS } from './types';

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (days === 1) return 'Yesterday';
  if (days < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function truncate(text: string | null, maxLen: number) {
  if (!text) return '';
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
}

const CATEGORY_COLORS: Record<string, string> = {
  cyan: 'bg-cyan-500/20 text-cyan-400',
  blue: 'bg-blue-500/20 text-blue-400',
  green: 'bg-green-500/20 text-green-400',
  yellow: 'bg-yellow-500/20 text-yellow-400',
  purple: 'bg-purple-500/20 text-purple-400',
  orange: 'bg-orange-500/20 text-orange-400',
  pink: 'bg-pink-500/20 text-pink-400',
  indigo: 'bg-indigo-500/20 text-indigo-400',
  red: 'bg-red-500/20 text-red-400',
  gray: 'bg-gray-500/20 text-gray-400',
};

interface EmailListProps {
  emails: EmailListItem[];
  selectedId: string | null;
  tab: 'inbox' | 'sent';
  onSelect: (id: string) => void;
  onToggleStar: (id: string) => void;
  // Bulk selection
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  bulkMode: boolean;
}

export function EmailList({ emails, selectedId, tab, onSelect, onToggleStar, selectedIds, onToggleSelect, bulkMode }: EmailListProps) {
  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium">No emails yet</p>
        <p className="text-xs mt-1">
          {tab === 'inbox' ? 'Incoming emails will appear here' : 'Sent emails will appear here'}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/5">
      {emails.map((email) => {
        const isSelected = email.id === selectedId;
        const isChecked = selectedIds.has(email.id);
        const displayName = tab === 'inbox'
          ? (email.fromName || email.fromAddress)
          : (email.toName || email.toAddress);

        const catInfo = email.aiCategory ? AI_CATEGORY_LABELS[email.aiCategory] : null;
        const statusInfo = email.status ? STATUS_LABELS[email.status] : null;

        return (
          <button
            key={email.id}
            onClick={() => onSelect(email.id)}
            className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors ${
              isSelected ? 'bg-white/10 border-l-2 border-cyan-500' : 'border-l-2 border-transparent'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Checkbox or unread indicator */}
              <div className="flex-shrink-0 mt-1">
                {bulkMode ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleSelect(email.id); }}
                    className="p-0.5"
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                ) : (
                  <div className="mt-0.5">
                    {!email.isRead && tab === 'inbox' ? (
                      <Circle className="w-2.5 h-2.5 fill-cyan-500 text-cyan-500" />
                    ) : (
                      <div className="w-2.5 h-2.5" />
                    )}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm truncate ${!email.isRead && tab === 'inbox' ? 'font-bold text-white' : 'text-gray-300'}`}>
                    {displayName}
                  </span>
                  <span className="text-xs text-gray-500 flex-shrink-0">{formatDate(email.createdAt)}</span>
                </div>
                <p className={`text-sm truncate mt-0.5 ${!email.isRead && tab === 'inbox' ? 'font-semibold text-gray-200' : 'text-gray-400'}`}>
                  {email.subject}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <p className="text-xs text-gray-500 truncate flex-1">
                    {truncate(email.bodyText, 60)}
                  </p>
                  {/* AI category badge */}
                  {catInfo && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${CATEGORY_COLORS[catInfo.color] || CATEGORY_COLORS.gray}`}>
                      {catInfo.label}
                    </span>
                  )}
                  {/* Status badge for outbound */}
                  {tab === 'sent' && statusInfo && email.status !== 'sent' && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${CATEGORY_COLORS[statusInfo.color] || CATEGORY_COLORS.gray}`}>
                      {statusInfo.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Star */}
              <button
                onClick={(e) => { e.stopPropagation(); onToggleStar(email.id); }}
                className="flex-shrink-0 mt-0.5 p-1 hover:bg-white/10 rounded transition-colors"
                aria-label={email.isStarred ? 'Unstar' : 'Star'}
              >
                <Star className={`w-3.5 h-3.5 ${email.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} />
              </button>
            </div>
          </button>
        );
      })}
    </div>
  );
}
