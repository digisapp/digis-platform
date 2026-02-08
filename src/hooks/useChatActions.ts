'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToastContext } from '@/context/ToastContext';
import type { Conversation, InsufficientBalanceInfo } from '@/components/chat/types';

interface UseChatActionsParams {
  conversationId: string;
  conversation: Conversation | null;
  currentUserId: string | null;
  currentUserRole: string | null;
  currentUserIsAdmin: boolean;
  recipientIsCreator: boolean;
  costPerMessage: number | null;
  hasAcknowledgedCharge: boolean;
  setHasAcknowledgedCharge: (v: boolean) => void;
  userBalance: number | null;
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  setPendingMessages: React.Dispatch<React.SetStateAction<Map<string, { content: string; timestamp: Date }>>>;
  fetchMessages: () => Promise<void>;
  fetchUserBalance: () => Promise<void>;
  scrollToBottom: (force?: boolean) => void;
  sendTypingIndicator: (isTyping: boolean) => Promise<void>;
}

export function useChatActions({
  conversationId,
  conversation,
  currentUserId,
  currentUserRole,
  currentUserIsAdmin,
  recipientIsCreator,
  costPerMessage,
  hasAcknowledgedCharge,
  setHasAcknowledgedCharge,
  userBalance,
  setMessages,
  setPendingMessages,
  fetchMessages,
  fetchUserBalance,
  scrollToBottom,
  sendTypingIndicator,
}: UseChatActionsParams) {
  const router = useRouter();
  const { showError } = useToastContext();

  // UI state
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [showTipModal, setShowTipModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showChargeWarning, setShowChargeWarning] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [insufficientBalanceInfo, setInsufficientBalanceInfo] = useState<InsufficientBalanceInfo | null>(null);

  const actualSendMessage = async (content: string) => {
    if (!conversation || !currentUserId) return;

    setSending(true);
    sendTypingIndicator(false);

    const tempId = `pending-${Date.now()}`;
    const timestamp = new Date();
    setPendingMessages(prev => new Map(prev).set(tempId, { content, timestamp }));
    setNewMessage('');
    setPendingMessage('');
    scrollToBottom(true);

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: conversation.otherUser.id, content }),
      });

      if (response.ok) {
        if (recipientIsCreator && (costPerMessage || 0) > 0) {
          setHasAcknowledgedCharge(true);
        }
        fetchUserBalance();
        fetchMessages();
      } else {
        const data = await response.json();
        setPendingMessages(prev => {
          const newMap = new Map(prev);
          newMap.delete(tempId);
          return newMap;
        });
        if (data.error?.includes('Insufficient balance')) {
          setPendingMessage(content);
          setShowChargeWarning(true);
        } else {
          showError(data.error || 'Failed to send message');
        }
      }
    } catch {
      setPendingMessages(prev => {
        const newMap = new Map(prev);
        newMap.delete(tempId);
        return newMap;
      });
      showError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversation) return;

    const shouldCheckCharge = recipientIsCreator && !currentUserIsAdmin;
    const chargeAmount = costPerMessage || 0;

    if (shouldCheckCharge && chargeAmount > 0) {
      if (!hasAcknowledgedCharge) {
        setPendingMessage(newMessage.trim());
        setShowChargeWarning(true);
        return;
      }
      if (userBalance !== null && userBalance < chargeAmount) {
        setPendingMessage(newMessage.trim());
        setShowChargeWarning(true);
        return;
      }
    }

    await actualSendMessage(newMessage.trim());
  };

  const handleUnlockMessage = async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/unlock`, { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        fetchMessages();
      } else {
        throw new Error(data.error || 'Failed to unlock message');
      }
    } catch (error) {
      console.error('Error unlocking message:', error);
      showError(error instanceof Error ? error.message : 'Failed to unlock message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, { method: 'DELETE' });
      const data = await response.json();
      if (response.ok) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      } else {
        throw new Error(data.error || 'Failed to delete message');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessages(prev => prev.map(m =>
          m.id === messageId ? { ...m, content: newContent, updatedAt: new Date() } : m
        ));
      } else {
        throw new Error(data.error || 'Failed to edit message');
      }
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  };

  const handleSendTip = async (amount: number, tipMessage: string, giftId?: string, giftEmoji?: string, giftName?: string) => {
    if (!conversation) return;
    try {
      const response = await fetch('/api/messages/tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId, receiverId: conversation.otherUser.id,
          amount, tipMessage, giftId, giftEmoji, giftName,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        fetchMessages();
      } else {
        throw new Error(data.error || 'Failed to send gift');
      }
    } catch (error) {
      console.error('Error sending gift:', error);
      throw error;
    }
  };

  const handleSendMedia = async (data: {
    file?: File;
    contentId?: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    caption: string;
    isLocked: boolean;
    unlockPrice: number;
  }) => {
    if (!conversation) return;
    try {
      let response;
      if (data.file) {
        const formData = new FormData();
        formData.append('file', data.file);
        formData.append('recipientId', conversation.otherUser.id);
        formData.append('caption', data.caption);
        formData.append('isLocked', data.isLocked.toString());
        formData.append('unlockPrice', data.unlockPrice.toString());
        response = await fetch('/api/messages/send-media', { method: 'POST', body: formData });
      } else if (data.mediaUrl) {
        response = await fetch('/api/messages/send-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientId: conversation.otherUser.id,
            mediaUrl: data.mediaUrl, mediaType: data.mediaType,
            contentId: data.contentId, caption: data.caption,
            isLocked: data.isLocked, unlockPrice: data.unlockPrice,
          }),
        });
      } else {
        throw new Error('No media provided');
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('File too large. Please choose a smaller file (under 5MB).');
      }

      const result = await response.json();
      if (!response.ok) {
        if (response.status === 402 && result.required && result.balance !== undefined) {
          setInsufficientBalanceInfo({ required: result.required, balance: result.balance, type: result.type || 'media' });
          return;
        }
        throw new Error(result.error || 'Failed to send media');
      }
      fetchMessages();
    } catch (error) {
      console.error('Error sending media:', error);
      throw error;
    }
  };

  const handleSendVoice = async (audioBlob: Blob, duration: number, unlockPrice?: number) => {
    if (!conversation) return;
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice-message.webm');
      formData.append('recipientId', conversation.otherUser.id);
      formData.append('duration', duration.toString());
      if (unlockPrice && unlockPrice > 0) {
        formData.append('isLocked', 'true');
        formData.append('unlockPrice', unlockPrice.toString());
      }
      const response = await fetch('/api/messages/send-voice', { method: 'POST', body: formData });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 402 && result.required && result.balance !== undefined) {
          setInsufficientBalanceInfo({ required: result.required, balance: result.balance, type: result.type || 'voice' });
          return;
        }
        throw new Error(result.error || 'Failed to send voice message');
      }
      fetchMessages();
      setShowVoiceRecorder(false);
    } catch (error) {
      console.error('Error sending voice message:', error);
      throw error;
    }
  };

  const handleBlockUser = async () => {
    if (!conversation) return;
    if (!confirm(`Block ${conversation.otherUser.username}? This will prevent them from viewing your streams, sending you messages, gifts, and call requests.`)) return;
    setIsBlocking(true);
    try {
      const response = await fetch('/api/users/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedId: conversation.otherUser.id, reason: 'Blocked from DM' }),
      });
      if (response.ok) {
        setShowOptionsMenu(false);
        router.push('/chats');
      } else {
        const data = await response.json();
        showError(data.error || 'Failed to block user');
      }
    } catch {
      showError('Failed to block user');
    } finally {
      setIsBlocking(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    if (value.trim()) {
      sendTypingIndicator(true);
    } else {
      sendTypingIndicator(false);
    }
  };

  const handleChargeConfirm = async () => {
    setShowChargeWarning(false);
    setHasAcknowledgedCharge(true);
    await actualSendMessage(pendingMessage);
  };

  const handleChargeClose = () => {
    setShowChargeWarning(false);
    setPendingMessage('');
  };

  return {
    // UI state
    sending, newMessage, setNewMessage,
    showTipModal, setShowTipModal,
    showMediaModal, setShowMediaModal,
    showChargeWarning, pendingMessage,
    showOptionsMenu, setShowOptionsMenu,
    showAttachmentMenu, setShowAttachmentMenu,
    showVoiceRecorder, setShowVoiceRecorder,
    isBlocking, insufficientBalanceInfo, setInsufficientBalanceInfo,
    // Handlers
    sendMessage, handleUnlockMessage, handleDeleteMessage, handleEditMessage,
    handleSendTip, handleSendMedia, handleSendVoice,
    handleBlockUser, handleInputChange,
    handleChargeConfirm, handleChargeClose,
  };
}
