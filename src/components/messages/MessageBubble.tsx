'use client';

import { useState } from 'react';
import { Trash2, X } from 'lucide-react';

type Message = {
  id: string;
  content: string;
  messageType: 'text' | 'media' | 'tip' | 'locked' | 'system' | null;
  createdAt: Date;
  isLocked: boolean;
  unlockPrice: number | null;
  unlockedBy: string | null;
  tipAmount: number | null;
  mediaUrl: string | null;
  mediaType: string | null;
  thumbnailUrl: string | null;
  sender: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
};

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  currentUserId: string;
  onUnlock?: (messageId: string) => Promise<void>;
  onDelete?: (messageId: string) => Promise<void>;
}

export function MessageBubble({ message, isOwnMessage, currentUserId, onUnlock, onDelete }: MessageBubbleProps) {
  const [unlocking, setUnlocking] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const formatTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const handleUnlock = async () => {
    if (!onUnlock) return;

    setUnlocking(true);
    try {
      await onUnlock(message.id);
    } catch (error) {
      console.error('Error unlocking message:', error);
    } finally {
      setUnlocking(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    setDeleting(true);
    try {
      await onDelete(message.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message');
    } finally {
      setDeleting(false);
    }
  };

  // Delete confirmation modal
  const DeleteConfirmModal = () => (
    <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="relative backdrop-blur-2xl bg-gradient-to-br from-black/80 via-gray-900/90 to-black/80 rounded-3xl max-w-sm w-full border-2 border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.3)] p-6 mx-auto">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <Trash2 className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Delete Message?</h3>
          <p className="text-gray-400 text-sm mb-6">
            This will permanently delete this message for both you and the recipient.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-semibold hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-all disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Delete button component
  const DeleteButton = () => {
    if (!isOwnMessage || !onDelete) return null;

    return (
      <button
        onClick={() => setShowDeleteConfirm(true)}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-all"
        title="Delete message"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    );
  };

  // Tip message
  if (message.messageType === 'tip' && message.tipAmount) {
    return (
      <>
        {showDeleteConfirm && <DeleteConfirmModal />}
        <div className={`group flex items-center gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
          {isOwnMessage && <DeleteButton />}
          <div className={`max-w-[70%]`}>
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">💰</span>
                <span className="text-yellow-400 font-bold text-lg">{message.tipAmount} coins</span>
              </div>
              {message.content && message.content !== `Sent ${message.tipAmount} coins` && (
                <p className="text-white text-sm">{message.content}</p>
              )}
            </div>
            <p className={`text-xs text-gray-500 mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
              {formatTime(message.createdAt)}
            </p>
          </div>
          {!isOwnMessage && <DeleteButton />}
        </div>
      </>
    );
  }

  // Locked message
  if (message.isLocked && message.unlockPrice) {
    const isUnlocked = message.unlockedBy === currentUserId || isOwnMessage;

    if (!isUnlocked) {
      return (
        <>
          {showDeleteConfirm && <DeleteConfirmModal />}
          <div className="group flex items-center gap-2 justify-start">
            <div className="max-w-[70%]">
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">🔒</span>
                  <div>
                    <p className="text-white font-semibold">Locked Message</p>
                    <p className="text-gray-400 text-sm">Unlock to view content</p>
                  </div>
                </div>

                {message.thumbnailUrl && (
                  <div className="relative mb-3 rounded-lg overflow-hidden">
                    <img
                      src={message.thumbnailUrl}
                      alt="Locked content preview"
                      className="w-full h-32 object-cover blur-xl"
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-6xl">🔒</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleUnlock}
                  disabled={unlocking}
                  className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {unlocking ? 'Unlocking...' : `Unlock for ${message.unlockPrice} coins`}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1 text-left">
                {formatTime(message.createdAt)}
              </p>
            </div>
          </div>
        </>
      );
    }

    // Unlocked locked message
    return (
      <>
        {showDeleteConfirm && <DeleteConfirmModal />}
        <div className={`group flex items-center gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
          {isOwnMessage && <DeleteButton />}
          <div className="max-w-[70%]">
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🔓</span>
                <span className="text-purple-400 text-sm font-medium">Unlocked</span>
              </div>

              {message.mediaUrl && (
                <div className="mb-3 rounded-lg overflow-hidden">
                  {message.mediaType === 'image' || message.mediaType === 'photo' ? (
                    <img
                      src={message.mediaUrl}
                      alt="Unlocked content"
                      className="w-full max-h-64 object-contain"
                    />
                  ) : message.mediaType === 'video' ? (
                    <video controls className="w-full max-h-64">
                      <source src={message.mediaUrl} type="video/mp4" />
                    </video>
                  ) : message.mediaType === 'audio' ? (
                    <audio controls className="w-full">
                      <source src={message.mediaUrl} type="audio/webm" />
                      <source src={message.mediaUrl} type="audio/ogg" />
                      Your browser does not support audio playback.
                    </audio>
                  ) : null}
                </div>
              )}

              <p className="text-white break-words">{message.content}</p>
            </div>
            <p className={`text-xs text-gray-500 mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
              {formatTime(message.createdAt)}
            </p>
          </div>
          {!isOwnMessage && <DeleteButton />}
        </div>
      </>
    );
  }

  // Regular text/media message
  return (
    <>
      {showDeleteConfirm && <DeleteConfirmModal />}
      <div className={`group flex items-center gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
        {isOwnMessage && <DeleteButton />}
        <div className="max-w-[70%]">
          {message.mediaUrl && (
            <div className="mb-2 rounded-lg overflow-hidden">
              {message.mediaType === 'image' || message.mediaType === 'photo' ? (
                <img
                  src={message.mediaUrl}
                  alt="Message media"
                  className="w-full max-h-64 object-contain"
                />
              ) : message.mediaType === 'video' ? (
                <video controls className="w-full max-h-64">
                  <source src={message.mediaUrl} type="video/mp4" />
                </video>
              ) : message.mediaType === 'audio' ? (
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🎤</span>
                    <span className="text-gray-300 text-sm font-medium">Voice Message</span>
                  </div>
                  <audio controls className="w-full">
                    <source src={message.mediaUrl} type="audio/webm" />
                    <source src={message.mediaUrl} type="audio/ogg" />
                    Your browser does not support audio playback.
                  </audio>
                </div>
              ) : null}
            </div>
          )}

          <div
            className={`px-4 py-3 rounded-2xl ${
              isOwnMessage
                ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                : 'bg-white/5 text-white'
            }`}
          >
            <p className="break-words">{message.content}</p>
          </div>
          <p className={`text-xs text-gray-500 mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
            {formatTime(message.createdAt)}
          </p>
        </div>
        {!isOwnMessage && <DeleteButton />}
      </div>
    </>
  );
}
