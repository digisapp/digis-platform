'use client';

import { useEffect, useState } from 'react';
import { MAX_CHAT_MESSAGES } from '@/hooks/useBroadcasterData';
import type { StreamMessage, Stream } from '@/db/schema';

interface UseBroadcasterInteractionsParams {
  streamId: string;
  stream: Stream | null;
  messages: StreamMessage[];
  clipIt: () => Promise<Blob | null>;
  clipBufferSeconds: number;
  setClipIsClipping: (v: boolean) => void;
  setMessages: React.Dispatch<React.SetStateAction<StreamMessage[]>>;
  menuEnabled: boolean;
  setMenuEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
}

export function useBroadcasterInteractions({
  streamId,
  stream,
  messages,
  clipIt,
  clipBufferSeconds,
  setClipIsClipping,
  setMessages,
  menuEnabled,
  setMenuEnabled,
  showSuccess,
  showError,
}: UseBroadcasterInteractionsParams) {
  const [pinnedMessage, setPinnedMessage] = useState<StreamMessage | null>(null);

  // Clear pinned message if the source message was deleted
  useEffect(() => {
    if (pinnedMessage && !messages.some(m => m.id === pinnedMessage.id)) {
      setPinnedMessage(null);
    }
  }, [messages, pinnedMessage]);

  const handleCreateClip = async () => {
    const blob = await clipIt();
    if (!blob) return;

    setClipIsClipping(true);
    try {
      const formData = new FormData();
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      formData.append('video', blob, `clip-${Date.now()}.${ext}`);
      formData.append('title', `Live Clip - ${stream?.title || 'Stream'}`);
      formData.append('streamId', streamId);
      formData.append('duration', String(Math.min(clipBufferSeconds, 30)));

      const response = await fetch('/api/clips/live', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create clip');
      }

      // Trigger instant download of the clip from the in-memory blob
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const safeName = (stream?.title || 'clip').replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
      a.download = `${safeName}-clip.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      showSuccess('Clipped & saved!');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create clip');
    } finally {
      setClipIsClipping(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    try {
      const payload = { content: message };
      console.log('[Broadcast] Sending message:', payload);

      const response = await fetch(`/api/streams/${streamId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error('Chat message error:', response.status, data);
        throw new Error(data.error || 'Failed to send message');
      }

      console.log('[Broadcast] Message sent successfully:', data);

      if (data.message) {
        setMessages((prev) => {
          if (prev.some(m => m.id === data.message.id)) {
            return prev;
          }
          const next = [...prev, data.message as StreamMessage];
          return next.length > MAX_CHAT_MESSAGES ? next.slice(-MAX_CHAT_MESSAGES) : next;
        });
      }
    } catch (err: any) {
      console.error('[Broadcast] Send message failed:', err);
      throw err;
    }
  };

  const handlePinMessage = (message: StreamMessage | null) => {
    if (message && pinnedMessage?.id === message.id) {
      setPinnedMessage(null);
    } else {
      setPinnedMessage(message);
    }
  };

  const handleToggleMenu = async () => {
    const newEnabled = !menuEnabled;
    console.log('[Menu] Creator toggling menu to:', newEnabled);
    setMenuEnabled(newEnabled);

    try {
      const response = await fetch(`/api/streams/${streamId}/tip-menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newEnabled }),
      });

      if (!response.ok) {
        setMenuEnabled(!newEnabled);
        console.error('[Menu] Failed to toggle menu');
      } else {
        const data = await response.json();
        console.log('[Menu] Toggle API response:', data);
      }
    } catch (err) {
      setMenuEnabled(!newEnabled);
      console.error('[Menu] Error toggling menu:', err);
    }
  };

  return {
    handleCreateClip,
    handleSendMessage,
    pinnedMessage,
    handlePinMessage,
    handleToggleMenu,
  };
}
