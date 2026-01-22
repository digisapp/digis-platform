'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Trash2, Check, CheckCheck, SmilePlus, Bot, Lock, Play, Image as ImageIcon, Images, Pencil, X, Reply, CornerUpLeft } from 'lucide-react';
import { ReactionPicker, ReactionDisplay, useMessageReactions } from './ReactionPicker';
import { useToastContext } from '@/context/ToastContext';

// Content card for AI-recommended content
interface ContentCardData {
  id: string;
  title: string;
  contentType: 'photo' | 'video' | 'gallery';
  unlockPrice: number;
  thumbnailUrl: string;
  mediaUrl?: string;
  isPurchased: boolean;
}

function ContentCard({ contentId, onPurchase }: { contentId: string; onPurchase?: () => void }) {
  const [content, setContent] = useState<ContentCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useToastContext();

  useEffect(() => {
    async function fetchContent() {
      try {
        const res = await fetch(`/api/content/${contentId}`);
        if (!res.ok) throw new Error('Content not found');
        const { content: data } = await res.json();
        setContent({
          id: data.id,
          title: data.title,
          contentType: data.contentType,
          unlockPrice: data.unlockPrice,
          thumbnailUrl: data.thumbnailUrl,
          mediaUrl: data.mediaUrl,
          isPurchased: data.hasAccess || data.isFree || false,
        });
      } catch (err) {
        setError('Content unavailable');
      } finally {
        setLoading(false);
      }
    }
    fetchContent();
  }, [contentId]);

  const handlePurchase = async () => {
    if (!content || content.isPurchased) return;

    setPurchasing(true);
    try {
      const res = await fetch(`/api/content/${contentId}/purchase`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Purchase failed');
      }

      // Refetch content to get media URL
      const refetch = await fetch(`/api/content/${contentId}`);
      if (refetch.ok) {
        const { content: data } = await refetch.json();
        setContent({
          id: data.id,
          title: data.title,
          contentType: data.contentType,
          unlockPrice: data.unlockPrice,
          thumbnailUrl: data.thumbnailUrl,
          mediaUrl: data.mediaUrl,
          isPurchased: true,
        });
      }
      showSuccess('Content unlocked!');
      onPurchase?.();
    } catch (err: any) {
      showError(err.message || 'Failed to purchase');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="my-2 p-3 bg-white/5 rounded-xl animate-pulse">
        <div className="h-24 bg-white/10 rounded-lg mb-2" />
        <div className="h-4 bg-white/10 rounded w-2/3" />
      </div>
    );
  }

  if (error || !content) {
    return null; // Silently skip invalid content
  }

  // If purchased, show content directly
  if (content.isPurchased) {
    const mediaToShow = content.mediaUrl || content.thumbnailUrl;
    return (
      <div className="my-2 rounded-2xl overflow-hidden">
        {content.contentType === 'video' ? (
          <video controls className="w-full max-h-80 rounded-2xl">
            <source src={mediaToShow} type="video/mp4" />
          </video>
        ) : (
          <img
            src={mediaToShow}
            alt={content.title}
            className="w-full max-h-80 object-contain rounded-2xl"
          />
        )}
      </div>
    );
  }

  // Locked content - show preview with unlock button
  const typeIcon = content.contentType === 'video' ? (
    <Play className="w-4 h-4" />
  ) : content.contentType === 'gallery' ? (
    <Images className="w-4 h-4" />
  ) : (
    <ImageIcon className="w-4 h-4" />
  );

  return (
    <div className="my-2 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl overflow-hidden">
      {/* Thumbnail */}
      <div className="relative h-32 bg-black/20">
        <img
          src={content.thumbnailUrl}
          alt={content.title}
          className="w-full h-full object-cover blur-sm"
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <Lock className="w-8 h-8 text-white/80" />
        </div>
        <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded-full flex items-center gap-1 text-white text-xs">
          {typeIcon}
          <span className="capitalize">{content.contentType}</span>
        </div>
      </div>

      {/* Unlock button */}
      <div className="p-3">
        <button
          onClick={handlePurchase}
          disabled={purchasing}
          className="w-full px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {purchasing ? 'Unlocking...' : `Unlock for ${content.unlockPrice} coins`}
        </button>
      </div>
    </div>
  );
}

// Parse message content and extract content card IDs
function parseMessageContent(content: string): Array<{ type: 'text' | 'content'; value: string }> {
  const parts: Array<{ type: 'text' | 'content'; value: string }> = [];
  const regex = /\[\[CONTENT:([a-f0-9-]+)\]\]/gi;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: content.slice(lastIndex, match.index) });
    }
    // Add the content card
    parts.push({ type: 'content', value: match[1] });
    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({ type: 'text', value: content.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', value: content }];
}

// URL regex pattern - matches http, https, and www URLs
const URL_REGEX = /(https?:\/\/[^\s<]+|www\.[^\s<]+\.[^\s<]+)/gi;

// Render text with clickable URLs
function LinkifyText({ text }: { text: string }) {
  const parts: Array<{ type: 'text' | 'url'; value: string }> = [];
  let lastIndex = 0;
  let match;

  // Reset regex state
  URL_REGEX.lastIndex = 0;

  while ((match = URL_REGEX.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    // Add the URL
    parts.push({ type: 'url', value: match[0] });
    lastIndex = URL_REGEX.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  if (parts.length === 0) {
    return <>{text}</>;
  }

  return (
    <>
      {parts.map((part, index) => {
        if (part.type === 'url') {
          // Ensure URL has protocol for href
          const href = part.value.startsWith('http') ? part.value : `https://${part.value}`;
          return (
            <a
              key={index}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2 break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {part.value}
            </a>
          );
        }
        return <span key={index}>{part.value}</span>;
      })}
    </>
  );
}

// Render parsed message content with content cards
function MessageContent({ content }: { content: string }) {
  const parts = parseMessageContent(content);

  return (
    <>
      {parts.map((part, index) => (
        part.type === 'text' ? (
          <span key={index} className="break-words whitespace-pre-wrap">
            <LinkifyText text={part.value} />
          </span>
        ) : (
          <ContentCard key={index} contentId={part.value} />
        )
      ))}
    </>
  );
}

type ReplyToMessage = {
  id: string;
  content: string;
  senderId: string;
  messageType: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  sender?: {
    id: string;
    displayName: string | null;
    username: string | null;
  };
};

type Message = {
  id: string;
  content: string;
  messageType: 'text' | 'media' | 'tip' | 'locked' | 'system' | null;
  createdAt: Date;
  updatedAt?: Date;
  isLocked: boolean;
  unlockPrice: number | null;
  unlockedBy: string | null;
  tipAmount: number | null;
  mediaUrl: string | null;
  mediaType: string | null;
  thumbnailUrl: string | null;
  isRead?: boolean;
  readAt?: Date | null;
  isAiGenerated?: boolean;
  replyTo?: ReplyToMessage | null;
  sender: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
};

// Edit window in minutes
const EDIT_WINDOW_MINUTES = 5;

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  currentUserId: string;
  onUnlock?: (messageId: string) => Promise<void>;
  onDelete?: (messageId: string) => Promise<void>;
  onEdit?: (messageId: string, newContent: string) => Promise<void>;
  onReply?: (message: Message) => void;
}

// Quoted message preview component
function QuotedMessagePreview({ replyTo, isOwnMessage }: { replyTo: ReplyToMessage; isOwnMessage: boolean }) {
  const senderName = replyTo.sender?.displayName || replyTo.sender?.username || 'Unknown';
  const hasMedia = replyTo.mediaUrl && replyTo.mediaType;

  // Truncate content for preview
  const previewContent = replyTo.content.length > 100
    ? replyTo.content.substring(0, 100) + '...'
    : replyTo.content;

  return (
    <div className={`mb-2 pl-3 border-l-2 ${isOwnMessage ? 'border-white/40' : 'border-cyan-400/60'} rounded-r-lg bg-white/5 py-2 pr-3`}>
      <div className="flex items-center gap-1.5 mb-1">
        <CornerUpLeft className="w-3 h-3 text-gray-400" />
        <span className="text-xs font-medium text-cyan-400">{senderName}</span>
      </div>
      <div className="flex items-center gap-2">
        {hasMedia && (
          <div className="flex-shrink-0">
            {replyTo.mediaType === 'image' || replyTo.mediaType === 'photo' ? (
              <ImageIcon className="w-4 h-4 text-gray-400" />
            ) : replyTo.mediaType === 'video' ? (
              <Play className="w-4 h-4 text-gray-400" />
            ) : (
              <span className="text-gray-400 text-xs">🎤</span>
            )}
          </div>
        )}
        <p className="text-xs text-gray-400 truncate">
          {hasMedia && !previewContent ? (
            <span className="italic">
              {replyTo.mediaType === 'image' || replyTo.mediaType === 'photo' ? 'Photo' :
               replyTo.mediaType === 'video' ? 'Video' : 'Voice message'}
            </span>
          ) : (
            previewContent || <span className="italic">Message</span>
          )}
        </p>
      </div>
    </div>
  );
}

export function MessageBubble({ message, isOwnMessage, currentUserId, onUnlock, onDelete, onEdit, onReply }: MessageBubbleProps) {
  const { showError } = useToastContext();
  const [unlocking, setUnlocking] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [saving, setSaving] = useState(false);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // Check if message can be edited (within 5 min window, is own message, is text type)
  const canEdit = isOwnMessage &&
    onEdit &&
    message.messageType === 'text' &&
    !message.mediaUrl &&
    (Date.now() - new Date(message.createdAt).getTime()) < EDIT_WINDOW_MINUTES * 60 * 1000;

  // Check if message was edited
  const wasEdited = message.updatedAt &&
    new Date(message.updatedAt).getTime() - new Date(message.createdAt).getTime() > 1000;

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.setSelectionRange(editContent.length, editContent.length);
    }
  }, [isEditing]);

  const handleSaveEdit = async () => {
    if (!onEdit || !editContent.trim() || editContent.trim() === message.content) {
      setIsEditing(false);
      setEditContent(message.content);
      return;
    }

    setSaving(true);
    try {
      await onEdit(message.id, editContent.trim());
      setIsEditing(false);
    } catch (error) {
      showError('Failed to edit message');
      setEditContent(message.content);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Reactions hook
  const { reactions, fetchReactions, toggleReaction } = useMessageReactions(message.id);

  // Fetch reactions on mount
  useEffect(() => {
    fetchReactions();
  }, [message.id]);

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
      showError('Failed to delete message');
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

  // Edit button component
  const EditButton = () => {
    if (!canEdit) return null;

    return (
      <button
        onClick={() => setIsEditing(true)}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition-all"
        title="Edit message"
      >
        <Pencil className="w-4 h-4" />
      </button>
    );
  };

  // Reply button component
  const ReplyButton = () => {
    if (!onReply || message.messageType === 'system') return null;

    return (
      <button
        onClick={() => onReply(message)}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition-all"
        title="Reply"
      >
        <Reply className="w-4 h-4" />
      </button>
    );
  };

  // Read receipt indicator for own messages
  const ReadReceipt = () => {
    if (!isOwnMessage) return null;

    return (
      <span className="inline-flex items-center ml-1" title={message.isRead ? 'Read' : 'Sent'}>
        {message.isRead ? (
          <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
        ) : (
          <Check className="w-3.5 h-3.5 text-gray-500" />
        )}
      </span>
    );
  };

  // Tip/Gift message
  if (message.messageType === 'tip' && message.tipAmount) {
    // Parse gift info from content: "Sent 🎂 Cake: message" or "Sent 🎂 Cake" or just coins
    // Use \S+ instead of \p{Emoji} to capture emoji sequences with variation selectors
    const giftMatch = message.content?.match(/^Sent\s+(\S+)\s+([^:]+)(?::\s*(.*))?$/u);
    // Check if first capture looks like an emoji (not a number like "100")
    const possibleEmoji = giftMatch?.[1];
    const isVirtualGift = !!giftMatch && possibleEmoji && !/^\d+$/.test(possibleEmoji);
    const giftEmoji = isVirtualGift ? possibleEmoji : undefined;
    const giftName = isVirtualGift ? giftMatch?.[2]?.trim() : undefined;
    const giftMessage = isVirtualGift ? giftMatch?.[3]?.trim() : undefined;

    // For plain coin gifts, check if there's a custom message
    const plainCoinMessage = !isVirtualGift && message.content && message.content !== `Sent ${message.tipAmount} coins`
      ? message.content
      : null;

    return (
      <>
        {showDeleteConfirm && <DeleteConfirmModal />}
        <div className={`group flex items-center gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
          {isOwnMessage && <DeleteButton />}
          <div className={`max-w-[70%]`}>
            <div className={`rounded-2xl px-4 py-3 ${
              isVirtualGift
                ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-2 border-pink-500/50'
                : 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50'
            }`}>
              {isVirtualGift ? (
                // Virtual Gift Display
                <>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-4xl">{giftEmoji}</span>
                    <div>
                      <span className="text-white font-bold text-lg">{giftName}</span>
                      <div className="text-yellow-400 text-sm font-medium">{message.tipAmount} coins</div>
                    </div>
                  </div>
                  {giftMessage && (
                    <p className="text-white/90 text-sm mt-2 pl-1 border-l-2 border-white/20 ml-1">
                      "{giftMessage}"
                    </p>
                  )}
                </>
              ) : (
                // Coin Gift Display
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg">
                      <span className="text-white font-black text-sm">D</span>
                    </div>
                    <span className="text-yellow-400 font-bold text-xl">{message.tipAmount} coins</span>
                  </div>
                  {plainCoinMessage && (
                    <p className="text-white/90 text-sm mt-1">"{plainCoinMessage}"</p>
                  )}
                </>
              )}
            </div>
            <p className={`text-xs text-gray-500 mt-1 flex items-center ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
              {formatTime(message.createdAt)}
              <ReadReceipt />
            </p>
          </div>
          {!isOwnMessage && <DeleteButton />}
        </div>
      </>
    );
  }

  // Free blurred message (fan media to creator - no cost to reveal)
  if (message.isLocked && (!message.unlockPrice || message.unlockPrice === 0)) {
    const isViewed = !!message.unlockedBy;

    // Sender view - show their media with viewed status
    if (isOwnMessage) {
      return (
        <>
          {showDeleteConfirm && <DeleteConfirmModal />}
          <div className="group flex items-center gap-2 justify-end">
            <DeleteButton />
            <div className="max-w-[70%]">
              {/* Show media (visible to sender) */}
              {message.mediaUrl && (
                <div className="rounded-2xl overflow-hidden">
                  {message.mediaType === 'image' || message.mediaType === 'photo' ? (
                    <img
                      src={message.mediaUrl}
                      alt="Content"
                      className="w-full max-h-80 object-contain rounded-2xl"
                    />
                  ) : message.mediaType === 'video' ? (
                    <video controls className="w-full max-h-80 rounded-2xl">
                      <source src={message.mediaUrl} type="video/mp4" />
                    </video>
                  ) : message.mediaType === 'audio' ? (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                      <audio controls className="w-full">
                        <source src={message.mediaUrl} type="audio/webm" />
                        <source src={message.mediaUrl} type="audio/ogg" />
                      </audio>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Caption */}
              {message.content && (
                <div className="mt-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-500">
                  <p className="text-white text-sm break-words">{message.content}</p>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-1 flex items-center justify-end gap-2">
                {formatTime(message.createdAt)}
                {isViewed ? (
                  <span className="text-cyan-400 flex items-center gap-1">
                    <CheckCheck className="w-3.5 h-3.5" />
                    Viewed
                  </span>
                ) : (
                  <span className="text-gray-500">Blurred</span>
                )}
              </p>
            </div>
          </div>
        </>
      );
    }

    // Recipient view - show blurred or revealed
    if (!isViewed) {
      return (
        <>
          {showDeleteConfirm && <DeleteConfirmModal />}
          <div className="group flex items-center gap-2 justify-start">
            <div className="max-w-[70%]">
              <div className="bg-gradient-to-br from-gray-500/20 to-gray-600/20 border-2 border-gray-500/50 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">📷</span>
                  <div>
                    <p className="text-white font-semibold">Media Message</p>
                    <p className="text-gray-400 text-sm">Tap to reveal</p>
                  </div>
                </div>

                {message.thumbnailUrl && (
                  <div className="relative mb-3 rounded-lg overflow-hidden">
                    <img
                      src={message.thumbnailUrl}
                      alt="Blurred content"
                      className="w-full h-32 object-cover blur-xl"
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-4xl">👁️</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleUnlock}
                  disabled={unlocking}
                  className="w-full px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {unlocking ? 'Revealing...' : 'Tap to Reveal'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1 flex items-center justify-start">
                {formatTime(message.createdAt)}
              </p>
            </div>
          </div>
        </>
      );
    }

    // Revealed - show media
    return (
      <>
        {showDeleteConfirm && <DeleteConfirmModal />}
        <div className="group flex items-center gap-2 justify-start">
          <div className="max-w-[70%]">
            {message.mediaUrl && (
              <div className="rounded-2xl overflow-hidden">
                {message.mediaType === 'image' || message.mediaType === 'photo' ? (
                  <img
                    src={message.mediaUrl}
                    alt="Content"
                    className="w-full max-h-80 object-contain rounded-2xl"
                  />
                ) : message.mediaType === 'video' ? (
                  <video controls className="w-full max-h-80 rounded-2xl">
                    <source src={message.mediaUrl} type="video/mp4" />
                  </video>
                ) : message.mediaType === 'audio' ? (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                    <audio controls className="w-full">
                      <source src={message.mediaUrl} type="audio/webm" />
                      <source src={message.mediaUrl} type="audio/ogg" />
                    </audio>
                  </div>
                ) : null}
              </div>
            )}

            {message.content && (
              <div className="mt-2 px-4 py-2 rounded-2xl bg-white/5">
                <p className="text-white text-sm break-words">{message.content}</p>
              </div>
            )}

            <p className="text-xs text-gray-500 mt-1 flex items-center justify-start">
              {formatTime(message.createdAt)}
            </p>
          </div>
          <DeleteButton />
        </div>
      </>
    );
  }

  // Paid locked message (PPV content)
  if (message.isLocked && message.unlockPrice && message.unlockPrice > 0) {
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
              <p className="text-xs text-gray-500 mt-1 flex items-center justify-start">
                {formatTime(message.createdAt)}
              </p>
            </div>
          </div>
        </>
      );
    }

    // Unlocked paid message - show media directly
    return (
      <>
        {showDeleteConfirm && <DeleteConfirmModal />}
        <div className={`group flex items-center gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
          {isOwnMessage && <DeleteButton />}
          <div className="max-w-[70%]">
            {message.mediaUrl && (
              <div className="rounded-2xl overflow-hidden">
                {message.mediaType === 'image' || message.mediaType === 'photo' ? (
                  <img
                    src={message.mediaUrl}
                    alt="Content"
                    className="w-full max-h-80 object-contain rounded-2xl"
                  />
                ) : message.mediaType === 'video' ? (
                  <video controls className="w-full max-h-80 rounded-2xl">
                    <source src={message.mediaUrl} type="video/mp4" />
                  </video>
                ) : message.mediaType === 'audio' ? (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                    <audio controls className="w-full">
                      <source src={message.mediaUrl} type="audio/webm" />
                      <source src={message.mediaUrl} type="audio/ogg" />
                    </audio>
                  </div>
                ) : null}
              </div>
            )}

            {message.content && (
              <div className={`mt-2 px-4 py-2 rounded-2xl ${isOwnMessage ? 'bg-gradient-to-r from-cyan-500 to-purple-500' : 'bg-white/5'}`}>
                <p className="text-white text-sm break-words">{message.content}</p>
              </div>
            )}

            <p className={`text-xs text-gray-500 mt-1 flex items-center ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
              {formatTime(message.createdAt)}
              {isOwnMessage && message.unlockedBy && (
                <span className="text-green-400 ml-2">Purchased</span>
              )}
              <ReadReceipt />
            </p>
          </div>
          {!isOwnMessage && <DeleteButton />}
        </div>
      </>
    );
  }

  // Reaction button component
  const ReactionButton = () => (
    <button
      onClick={() => setShowReactionPicker(!showReactionPicker)}
      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition-all"
      title="Add reaction"
    >
      <SmilePlus className="w-4 h-4" />
    </button>
  );

  // Regular text/media message
  return (
    <>
      {showDeleteConfirm && <DeleteConfirmModal />}
      <div className={`group flex items-center gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
        {isOwnMessage && !isEditing && (
          <div className="flex items-center gap-1">
            <DeleteButton />
            <EditButton />
            <ReplyButton />
            <div className="relative">
              <ReactionButton />
              <ReactionPicker
                isVisible={showReactionPicker}
                onReact={toggleReaction}
                onClose={() => setShowReactionPicker(false)}
                existingReaction={reactions.find(r => r.userReacted)?.emoji}
                position="left"
              />
            </div>
          </div>
        )}
        <div className="max-w-[70%]">
          {/* Show quoted message if this is a reply */}
          {message.replyTo && (
            <QuotedMessagePreview replyTo={message.replyTo} isOwnMessage={isOwnMessage} />
          )}

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

          {isEditing ? (
            /* Edit mode UI */
            <div className="w-full">
              <textarea
                ref={editInputRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleEditKeyDown}
                className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-cyan-400 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none"
                rows={Math.min(5, editContent.split('\n').length + 1)}
                disabled={saving}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving || !editContent.trim()}
                  className="px-3 py-1.5 text-sm bg-cyan-500 text-white rounded-lg hover:bg-cyan-400 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            /* Normal display */
            <div
              className={`px-4 py-3 rounded-2xl ${
                isOwnMessage
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                  : message.isAiGenerated
                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-white'
                    : 'bg-white/5 text-white'
              }`}
            >
              {message.isAiGenerated && (
                <div className="flex items-center gap-1.5 mb-1.5 text-purple-400">
                  <Bot className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">AI Twin</span>
                </div>
              )}
              <div className="break-words whitespace-pre-wrap">
                {message.isAiGenerated ? (
                  <MessageContent content={message.content} />
                ) : (
                  <LinkifyText text={message.content} />
                )}
              </div>
            </div>
          )}

          {/* Reactions display */}
          <ReactionDisplay
            reactions={reactions}
            onReact={toggleReaction}
            compact
          />

          <p className={`text-xs text-gray-500 mt-1 flex items-center gap-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            {formatTime(message.createdAt)}
            {wasEdited && <span className="text-gray-600">(edited)</span>}
            <ReadReceipt />
          </p>
        </div>
        {!isOwnMessage && (
          <div className="flex items-center gap-1">
            <ReplyButton />
            <div className="relative">
              <ReactionButton />
              <ReactionPicker
                isVisible={showReactionPicker}
                onReact={toggleReaction}
                onClose={() => setShowReactionPicker(false)}
                existingReaction={reactions.find(r => r.userReacted)?.emoji}
                position="right"
              />
            </div>
            <DeleteButton />
          </div>
        )}
      </div>
    </>
  );
}
