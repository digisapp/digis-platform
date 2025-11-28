'use client';

import { useState, useRef, useEffect } from 'react';
import { VALID_REACTION_EMOJIS } from '@/db/schema/messages';

interface ReactionPickerProps {
  onReact: (emoji: string) => void;
  onClose: () => void;
  existingReaction?: string | null;
  isVisible: boolean;
  position?: 'left' | 'right';
}

export function ReactionPicker({
  onReact,
  onClose,
  existingReaction,
  isVisible,
  position = 'right',
}: ReactionPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div
      ref={pickerRef}
      className={`
        absolute bottom-full mb-2 z-50
        ${position === 'right' ? 'right-0' : 'left-0'}
        bg-gray-900 border border-white/20 rounded-full
        px-2 py-1.5 flex gap-1 shadow-xl
        animate-in fade-in slide-in-from-bottom-2 duration-200
      `}
    >
      {VALID_REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => {
            onReact(emoji);
            onClose();
          }}
          className={`
            w-8 h-8 flex items-center justify-center text-lg
            rounded-full transition-all
            hover:bg-white/10 hover:scale-125
            ${existingReaction === emoji ? 'bg-white/20 scale-110' : ''}
          `}
          title={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

// Compact reaction display for showing under messages
interface ReactionDisplayProps {
  reactions: Array<{
    emoji: string;
    count: number;
    userReacted: boolean;
  }>;
  onReact: (emoji: string) => void;
  compact?: boolean;
}

export function ReactionDisplay({ reactions, onReact, compact = false }: ReactionDisplayProps) {
  if (reactions.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 ${compact ? 'mt-1' : 'mt-2'}`}>
      {reactions.map(({ emoji, count, userReacted }) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          className={`
            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
            transition-all
            ${userReacted
              ? 'bg-cyan-500/30 border border-cyan-500/50 text-cyan-300'
              : 'bg-white/10 border border-white/20 text-gray-300 hover:bg-white/20'
            }
          `}
        >
          <span className="text-sm">{emoji}</span>
          <span className="font-medium">{count}</span>
        </button>
      ))}
    </div>
  );
}

// Hook for managing reactions on a message
export function useMessageReactions(messageId: string) {
  const [reactions, setReactions] = useState<Array<{
    emoji: string;
    count: number;
    users: any[];
    userReacted: boolean;
  }>>([]);
  const [loading, setLoading] = useState(false);

  const fetchReactions = async () => {
    try {
      const res = await fetch(`/api/messages/${messageId}/react`);
      if (res.ok) {
        const data = await res.json();
        setReactions(data.reactions);
      }
    } catch (err) {
      console.error('Failed to fetch reactions:', err);
    }
  };

  const addReaction = async (emoji: string) => {
    // Optimistic update
    setReactions(prev => {
      const existing = prev.find(r => r.emoji === emoji);
      if (existing) {
        if (existing.userReacted) {
          // Already reacted, no change
          return prev;
        }
        // Add to existing
        return prev.map(r =>
          r.emoji === emoji
            ? { ...r, count: r.count + 1, userReacted: true }
            : r
        );
      }
      // New reaction
      return [...prev, { emoji, count: 1, users: [], userReacted: true }];
    });

    try {
      await fetch(`/api/messages/${messageId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
    } catch (err) {
      console.error('Failed to add reaction:', err);
      // Revert on error
      fetchReactions();
    }
  };

  const removeReaction = async (emoji: string) => {
    // Optimistic update
    setReactions(prev => {
      return prev
        .map(r => {
          if (r.emoji === emoji && r.userReacted) {
            const newCount = r.count - 1;
            if (newCount <= 0) return null;
            return { ...r, count: newCount, userReacted: false };
          }
          return r;
        })
        .filter(Boolean) as typeof prev;
    });

    try {
      await fetch(`/api/messages/${messageId}/react`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
    } catch (err) {
      console.error('Failed to remove reaction:', err);
      // Revert on error
      fetchReactions();
    }
  };

  const toggleReaction = async (emoji: string) => {
    const existing = reactions.find(r => r.emoji === emoji);
    if (existing?.userReacted) {
      await removeReaction(emoji);
    } else {
      await addReaction(emoji);
    }
  };

  return {
    reactions,
    loading,
    fetchReactions,
    addReaction,
    removeReaction,
    toggleReaction,
  };
}
