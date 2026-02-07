'use client';

import { useEffect, useState } from 'react';
import { getAblyClient } from '@/lib/ably/client';

interface PrivateTip {
  id: string;
  senderId: string;
  senderUsername: string;
  amount: number;
  note: string;
  timestamp: number;
}

interface UsePrivateTipsOptions {
  userId: string | null;
  isVisible: boolean;
}

/**
 * Subscribes to private tip notifications via Ably for the current user.
 * Plays tiered notification sounds based on tip amount.
 */
export function usePrivateTips({ userId, isVisible }: UsePrivateTipsOptions) {
  const [privateTips, setPrivateTips] = useState<PrivateTip[]>([]);
  const [hasNewPrivateTips, setHasNewPrivateTips] = useState(false);

  // Clear new tips indicator when panel becomes visible
  useEffect(() => {
    if (isVisible) {
      setHasNewPrivateTips(false);
    }
  }, [isVisible]);

  useEffect(() => {
    if (!userId) return;

    let mounted = true;
    let notificationsChannel: any = null;

    const subscribe = async () => {
      try {
        const ably = getAblyClient();

        if (ably.connection.state !== 'connected') {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
            ably.connection.once('connected', () => { clearTimeout(timeout); resolve(); });
            ably.connection.once('failed', () => { clearTimeout(timeout); reject(new Error('Connection failed')); });
          });
        }

        if (!mounted) return;

        notificationsChannel = ably.channels.get(`user:${userId}:notifications`);
        notificationsChannel.subscribe('private_tip', (message: any) => {
          const tipData = message.data;
          if (mounted && tipData.note) {
            setPrivateTips((prev) => [
              {
                id: `tip-${Date.now()}-${Math.random()}`,
                senderId: tipData.senderId,
                senderUsername: tipData.senderUsername,
                amount: tipData.amount,
                note: tipData.note,
                timestamp: tipData.timestamp || Date.now(),
              },
              ...prev,
            ].slice(0, 50));

            // Tiered notification sounds
            let soundFile = '/sounds/coin-common.mp3';
            if (tipData.amount >= 1000) soundFile = '/sounds/coin-legendary.mp3';
            else if (tipData.amount >= 500) soundFile = '/sounds/coin-epic.mp3';
            else if (tipData.amount >= 200) soundFile = '/sounds/coin-rare.mp3';
            else if (tipData.amount >= 50) soundFile = '/sounds/coin-super.mp3';
            else if (tipData.amount >= 10) soundFile = '/sounds/coin-nice.mp3';

            const audio = new Audio(soundFile);
            audio.volume = 0.6;
            audio.play().catch(() => {});

            if (!isVisible) {
              setHasNewPrivateTips(true);
            }
          }
        });
      } catch (err) {
        console.error('[PrivateTips] Error subscribing:', err);
      }
    };

    subscribe();

    return () => {
      mounted = false;
      if (notificationsChannel && notificationsChannel.state === 'attached') {
        notificationsChannel.unsubscribe();
        notificationsChannel.detach().catch(() => {});
      }
    };
  }, [userId, isVisible]);

  return { privateTips, hasNewPrivateTips, setHasNewPrivateTips };
}
