'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { GiftAlert } from './GiftAlert';
import { TopTipperSpotlight } from './TopTipperSpotlight';
import { GoalCelebration } from './GoalCelebration';
import type { VirtualGift, StreamGift, StreamGoal } from '@/db/schema';

export type Alert =
  | { type: 'gift'; gift: VirtualGift; streamGift: StreamGift; senderUsername: string; id: string }
  | { type: 'topTipper'; username: string; amount: number; avatarUrl?: string | null; id: string }
  | { type: 'goalComplete'; goal: StreamGoal; id: string };

interface AlertManagerProps {
  alerts: Alert[];
  onAlertComplete: (id: string) => void;
}

// Get the coin value of an alert for prioritization
function getAlertValue(alert: Alert): number {
  switch (alert.type) {
    case 'gift':
      return alert.gift.coinCost * (alert.streamGift.quantity || 1);
    case 'topTipper':
      return alert.amount;
    case 'goalComplete':
      return 10000; // Goal completions always highest priority
    default:
      return 0;
  }
}

export function AlertManager({ alerts, onAlertComplete }: AlertManagerProps) {
  const [currentAlert, setCurrentAlert] = useState<Alert | null>(null);
  const [queue, setQueue] = useState<Alert[]>([]);

  // Sort alerts by value (highest first) so bigger gifts/tips always show first
  const sortedAlerts = useMemo(() => {
    return [...alerts].sort((a, b) => getAlertValue(b) - getAlertValue(a));
  }, [alerts]);

  // Update queue when new alerts come in (sorted by value)
  useEffect(() => {
    setQueue(sortedAlerts);
  }, [sortedAlerts]);

  // Show next alert when current one completes
  // If a higher value alert comes in, it will be first in queue next time
  useEffect(() => {
    if (!currentAlert && queue.length > 0) {
      const next = queue[0];
      setCurrentAlert(next);
      setQueue(prev => prev.slice(1));
    }
  }, [currentAlert, queue]);

  const handleAlertComplete = useCallback(() => {
    if (currentAlert) {
      onAlertComplete(currentAlert.id);
      setCurrentAlert(null);
    }
  }, [currentAlert, onAlertComplete]);

  if (!currentAlert) return null;

  switch (currentAlert.type) {
    case 'gift':
      return (
        <GiftAlert
          gift={currentAlert.gift}
          streamGift={currentAlert.streamGift}
          senderUsername={currentAlert.senderUsername}
          onComplete={handleAlertComplete}
        />
      );

    case 'topTipper':
      return (
        <TopTipperSpotlight
          username={currentAlert.username}
          amount={currentAlert.amount}
          avatarUrl={currentAlert.avatarUrl}
          onComplete={handleAlertComplete}
        />
      );

    case 'goalComplete':
      return (
        <GoalCelebration
          goal={currentAlert.goal}
          onComplete={handleAlertComplete}
        />
      );

    default:
      return null;
  }
}
