'use client';

import { useState } from 'react';
import type { StreamMessage } from '@/db/schema';
import { useToastContext } from '@/context/ToastContext';

type ModerationToolsProps = {
  message: StreamMessage;
  streamId: string;
  onMessageDeleted?: () => void;
  onPinMessage?: (message: StreamMessage) => void;
  isPinned?: boolean;
  onShoutout?: (username: string) => void;
};

export function ModerationTools({ message, streamId, onMessageDeleted, onPinMessage, isPinned, onShoutout }: ModerationToolsProps) {
  const { showSuccess, showError } = useToastContext();
  const [showMenu, setShowMenu] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDeleteMessage = async () => {
    if (!confirm('Delete this message?')) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/streams/${streamId}/messages/${message.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onMessageDeleted?.();
        setShowMenu(false);
      } else {
        showError('Failed to delete message');
      }
    } catch (error) {
      showError('Failed to delete message');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTimeoutUser = async (duration: number) => {
    if (!confirm(`Timeout ${message.username} for ${duration} minutes?`)) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/streams/${streamId}/timeout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: message.userId,
          duration,
        }),
      });

      if (response.ok) {
        showSuccess(`${message.username} has been timed out for ${duration} minutes`);
        setShowMenu(false);
      } else {
        showError('Failed to timeout user');
      }
    } catch (error) {
      showError('Failed to timeout user');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBanUser = async () => {
    if (!confirm(`Permanently ban ${message.username} from this stream?`)) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/streams/${streamId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: message.userId,
        }),
      });

      if (response.ok) {
        showSuccess(`${message.username} has been banned from this stream`);
        setShowMenu(false);
      } else {
        showError('Failed to ban user');
      }
    } catch (error) {
      showError('Failed to ban user');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBlockUser = async () => {
    if (!confirm(`Block ${message.username}? This will prevent them from viewing your streams, sending messages, gifts, and call requests.`)) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/users/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockedId: message.userId,
          reason: 'Blocked from stream chat',
        }),
      });

      if (response.ok) {
        showSuccess(`${message.username} has been blocked`);
        setShowMenu(false);
      } else {
        const data = await response.json();
        showError(data.error || 'Failed to block user');
      }
    } catch (error) {
      showError('Failed to block user');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShoutout = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/streams/${streamId}/shoutout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: message.username,
          userId: message.userId,
        }),
      });

      if (response.ok) {
        setShowMenu(false);
        onShoutout?.(message.username);
      } else {
        showError('Failed to send shoutout');
      }
    } catch (error) {
      showError('Failed to send shoutout');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="text-gray-500 hover:text-white transition-colors p-1 rounded opacity-0 group-hover:opacity-100"
        title="Moderation"
      >
        ⋯
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-6 bg-black/95 backdrop-blur-xl rounded-lg border border-white/20 p-2 min-w-[160px] z-50 shadow-xl">
            {onPinMessage && (
              <button
                onClick={() => {
                  onPinMessage(message);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-yellow-400 hover:bg-white/10 rounded flex items-center gap-2"
              >
                📌 {isPinned ? 'Unpin Message' : 'Pin Message'}
              </button>
            )}
            <button
              onClick={handleShoutout}
              disabled={isProcessing}
              className="w-full text-left px-3 py-2 text-sm text-cyan-400 hover:bg-white/10 rounded flex items-center gap-2 disabled:opacity-50"
            >
              📣 Shoutout
            </button>
            <button
              onClick={handleDeleteMessage}
              disabled={isProcessing}
              className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded flex items-center gap-2 disabled:opacity-50"
            >
              🗑️ Delete Message
            </button>
            <button
              onClick={() => handleTimeoutUser(1)}
              disabled={isProcessing}
              className="w-full text-left px-3 py-2 text-sm text-yellow-400 hover:bg-white/10 rounded flex items-center gap-2 disabled:opacity-50"
            >
              ⏱️ Timeout 1 min
            </button>
            <button
              onClick={() => handleTimeoutUser(5)}
              disabled={isProcessing}
              className="w-full text-left px-3 py-2 text-sm text-yellow-400 hover:bg-white/10 rounded flex items-center gap-2 disabled:opacity-50"
            >
              ⏱️ Timeout 5 min
            </button>
            <button
              onClick={() => handleTimeoutUser(60)}
              disabled={isProcessing}
              className="w-full text-left px-3 py-2 text-sm text-orange-400 hover:bg-white/10 rounded flex items-center gap-2 disabled:opacity-50"
            >
              ⏱️ Timeout 1 hour
            </button>
            <div className="border-t border-white/10 my-1" />
            <button
              onClick={handleBanUser}
              disabled={isProcessing}
              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-white/10 rounded flex items-center gap-2 disabled:opacity-50"
            >
              🚫 Ban from Stream
            </button>
            <button
              onClick={handleBlockUser}
              disabled={isProcessing}
              className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-white/10 rounded flex items-center gap-2 disabled:opacity-50"
            >
              ⛔ Block User
            </button>
          </div>
        </>
      )}
    </div>
  );
}
