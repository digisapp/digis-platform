'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

// Threshold for interrupting - new alert must be at least 3x the value
const INTERRUPT_MULTIPLIER = 3;

export function AlertManager({ alerts, onAlertComplete }: AlertManagerProps) {
  const [currentAlert, setCurrentAlert] = useState<Alert | null>(null);
  const [queue, setQueue] = useState<Alert[]>([]);
  const processedIds = useRef<Set<string>>(new Set());

  // Sort alerts by value (highest first) so bigger gifts/tips always show first
  const sortedAlerts = useMemo(() => {
    return [...alerts].sort((a, b) => getAlertValue(b) - getAlertValue(a));
  }, [alerts]);

  // Check for high-value alerts that should interrupt the current one
  useEffect(() => {
    if (!currentAlert) return;

    const currentValue = getAlertValue(currentAlert);

    // Find any unprocessed alert that's significantly higher value
    const interruptingAlert = sortedAlerts.find(alert => {
      if (processedIds.current.has(alert.id)) return false;
      if (alert.id === currentAlert.id) return false;

      const newValue = getAlertValue(alert);
      // Interrupt if new alert is 3x+ the current value, or if current is small (< 100) and new is large (500+)
      return newValue >= currentValue * INTERRUPT_MULTIPLIER ||
             (currentValue < 100 && newValue >= 500);
    });

    if (interruptingAlert) {
      // Mark current as complete and immediately show the higher value one
      processedIds.current.add(currentAlert.id);
      onAlertComplete(currentAlert.id);
      processedIds.current.add(interruptingAlert.id);
      setCurrentAlert(interruptingAlert);
      // Remove interrupted alert from queue
      setQueue(prev => prev.filter(a => a.id !== interruptingAlert.id));
    }
  }, [sortedAlerts, currentAlert, onAlertComplete]);

  // Update queue when new alerts come in (sorted by value, excluding processed)
  useEffect(() => {
    const newQueue = sortedAlerts.filter(a => !processedIds.current.has(a.id));
    setQueue(newQueue);
  }, [sortedAlerts]);

  // Show next alert when current one completes
  useEffect(() => {
    if (!currentAlert && queue.length > 0) {
      const next = queue[0];
      if (!processedIds.current.has(next.id)) {
        processedIds.current.add(next.id);
        setCurrentAlert(next);
        setQueue(prev => prev.slice(1));
      }
    }
  }, [currentAlert, queue]);

  // Clean up old processed IDs periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      // Keep only IDs from current alerts array
      const currentIds = new Set(alerts.map(a => a.id));
      processedIds.current = new Set(
        [...processedIds.current].filter(id => currentIds.has(id))
      );
    }, 30000);
    return () => clearInterval(cleanup);
  }, [alerts]);

  const handleAlertComplete = useCallback(() => {
    if (currentAlert) {
      processedIds.current.add(currentAlert.id);
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
