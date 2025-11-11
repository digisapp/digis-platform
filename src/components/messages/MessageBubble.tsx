'use client';

import { useState } from 'react';

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
}

export function MessageBubble({ message, isOwnMessage, currentUserId, onUnlock }: MessageBubbleProps) {
  const [unlocking, setUnlocking] = useState(false);

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

  // Tip message
  if (message.messageType === 'tip' && message.tipAmount) {
    return (
      <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[70%]`}>
          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">💰</span>
              <span className="text-yellow-400 font-bold text-lg">{message.tipAmount} coins</span>
            </div>
            {message.content && message.content !== `Sent ${message.tipAmount} coins` && (
              <p className="text-gray-800 text-sm">{message.content}</p>
            )}
          </div>
          <p className={`text-xs text-gray-600 mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
            {formatTime(message.createdAt)}
          </p>
        </div>
      </div>
    );
  }

  // Locked message
  if (message.isLocked && message.unlockPrice) {
    const isUnlocked = message.unlockedBy === currentUserId || isOwnMessage;

    if (!isUnlocked) {
      return (
        <div className="flex justify-start">
          <div className="max-w-[70%]">
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🔒</span>
                <div>
                  <p className="text-gray-800 font-semibold">Locked Message</p>
                  <p className="text-gray-600 text-sm">Unlock to view content</p>
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
            <p className="text-xs text-gray-600 mt-1 text-left">
              {formatTime(message.createdAt)}
            </p>
          </div>
        </div>
      );
    }

    // Unlocked locked message
    return (
      <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
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
                ) : null}
              </div>
            )}

            <p className="text-gray-800 break-words">{message.content}</p>
          </div>
          <p className={`text-xs text-gray-600 mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
            {formatTime(message.createdAt)}
          </p>
        </div>
      </div>
    );
  }

  // Regular text/media message
  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
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
            ) : null}
          </div>
        )}

        <div
          className={`px-4 py-3 rounded-2xl ${
            isOwnMessage
              ? 'bg-gradient-to-r from-digis-cyan to-digis-pink text-gray-900'
              : 'bg-white/80 border border-purple-200 text-gray-800'
          }`}
        >
          <p className="break-words">{message.content}</p>
        </div>
        <p className={`text-xs text-gray-600 mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
